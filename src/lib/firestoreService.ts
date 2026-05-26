import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    serverTimestamp,
    deleteDoc,
    Timestamp,
    orderBy,
    limit
} from "firebase/firestore";
import { db, auth } from "./firebase";

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface UserProfile {
    uid: string;
    email: string;
    lastLogin: any;
}

export interface ProjectCollaborator {
    role: 'editor' | 'viewer';
    viewMode: 'admin' | 'client';
}

export interface CloudProject {
    id: string;
    ownerId: string;
    title: string;
    lastModified: any;
    collaborators?: { [uid: string]: ProjectCollaborator | 'editor' | 'viewer' };
    collaboratorUids?: string[];
    data: {
        tasks: any[];
        resources: any[];
        allocations: any;
        rates: any[];
        invoices: any[];
        config: {
            wbsLabel: string;
            responsibleLabel: string;
            projectStart: string;
            projectEnd: string;
            isRelativeTime: boolean;
            statusDate: string | null;
            isClientView?: boolean;
        }
    }
}

const cleanForFirestore = (obj: any): any => {
    if (Array.isArray(obj)) {
        return obj.map(v => cleanForFirestore(v));
    } else if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
        return Object.fromEntries(
            Object.entries(obj)
                .filter(([_, v]) => v !== undefined)
                .map(([k, v]) => [k, cleanForFirestore(v)])
        );
    }
    return obj;
};

export const saveUserProfile = async (user: { uid: string, email: string | null }) => {
    if (!user.email) return;
    const userRef = doc(db, "users_meta", user.uid);
    try {
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email,
            lastLogin: serverTimestamp()
        }, { merge: true });
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `users_meta/${user.uid}`);
    }
};

export const findUserByEmail = async (email: string): Promise<UserProfile | null> => {
    try {
        const usersRef = collection(db, "users_meta");
        const q = query(usersRef, where("email", "==", email.toLowerCase()), limit(1));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            return querySnapshot.docs[0].data() as UserProfile;
        }
        return null;
    } catch (e) {
        handleFirestoreError(e, OperationType.GET, "users_meta");
    }
};

const MAX_DOC_SIZE_BYTES = 1_000_000; // 1MB límite de seguridad

const validateProjectData = (data: any): string | null => {
    if (!data || typeof data !== 'object') return 'Datos del proyecto inválidos.';
    if (typeof data.title !== 'string' || data.title.trim().length === 0) return 'El título del proyecto es obligatorio.';
    if (data.title.length > 200) return 'El título no puede superar 200 caracteres.';
    if (!data.data || typeof data.data !== 'object') return 'Falta el bloque de datos del proyecto.';
    const d = data.data;
    if (!Array.isArray(d.tasks)) return 'Las tareas deben ser un array.';
    if (!Array.isArray(d.resources)) return 'Los recursos deben ser un array.';
    if (!Array.isArray(d.rates)) return 'Las tarifas deben ser un array.';
    if (!Array.isArray(d.invoices)) return 'Las facturas deben ser un array.';
    if (!d.config || typeof d.config !== 'object') return 'Falta la configuración del proyecto.';
    const json = JSON.stringify(data);
    if (json.length > MAX_DOC_SIZE_BYTES) return `El proyecto excede el tamaño máximo permitido (${Math.round(json.length / 1024)}KB > ${MAX_DOC_SIZE_BYTES / 1024}KB).`;
    return null;
};

export const saveProjectToCloud = async (userId: string, projectId: string, projectData: any) => {
    const error = validateProjectData(projectData);
    if (error) throw new Error(error);

    // New structure uses /projects collection
    const projectRef = doc(db, "projects", projectId);
    const cleanedData = cleanForFirestore(projectData);

    try {
        await setDoc(projectRef, {
            ...cleanedData,
            ownerId: userId,
            lastModified: serverTimestamp()
        }, { merge: true });
    } catch (e) {
        handleFirestoreError(e, OperationType.WRITE, `projects/${projectId}`);
    }

    return projectId;
};

export const getProjectFromCloud = async (userId: string, projectId: string): Promise<CloudProject | null> => {
    // Try new location first
    try {
        const projectRef = doc(db, "projects", projectId);
        const docSnap = await getDoc(projectRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as any;
        }
    } catch (e: any) {
        console.warn("Project not found in root /projects or access denied:", e);
        if (e.code === "permission-denied" || (e.message && e.message.includes("permission"))) {
            handleFirestoreError(e, OperationType.GET, `projects/${projectId}`);
        }
    }

    // Try old location for backward compatibility
    try {
        const projectRef = doc(db, "users", userId, "projects", projectId);
        const docSnap = await getDoc(projectRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            return {
                id: projectId,
                ...data,
                ownerId: userId // Map old structure to new one
            } as any;
        }
    } catch (e: any) {
        console.error("Error loading old project format:", e);
        if (e.code === "permission-denied" || (e.message && e.message.includes("permission"))) {
            handleFirestoreError(e, OperationType.GET, `users/${userId}/projects/${projectId}`);
        }
    }

    return null;
};

export const listUserProjects = async (userId: string) => {
    // 1. Projects where I am Owner
    let ownerProjects: CloudProject[] = [];
    try {
        const projectsRef = collection(db, "projects");
        const qOwner = query(projectsRef, where("ownerId", "==", userId));
        const ownerSnap = await getDocs(qOwner);
        ownerProjects = ownerSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    } catch (e: any) {
        console.error("Error listing owner projects:", e);
        if (e.code === "permission-denied" || (e.message && e.message.includes("permission"))) {
            handleFirestoreError(e, OperationType.LIST, "projects");
        }
    }

    // 2. Projects where I am Collaborator
    let collProjects: CloudProject[] = [];
    try {
        const projectsRef = collection(db, "projects");
        // Intentamos por el nuevo campo collaboratorUids (más eficiente y seguro)
        try {
            const qArray = query(projectsRef, where("collaboratorUids", "array-contains", userId));
            const arraySnap = await getDocs(qArray);
            collProjects = arraySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        } catch (e2) {
            // Si el campo no existe o falla, intentar por el mapa antiguo (requiere índices dinámicos)
            const qMap = query(projectsRef, where(`collaborators.${userId}`, "in", ["editor", "viewer"]));
            const mapSnap = await getDocs(qMap);
            collProjects = mapSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
        }
    } catch (e: any) {
        console.warn("Could not query collaborations reliably:", e);
        if (e.code === "permission-denied" || (e.message && e.message.includes("permission"))) {
            handleFirestoreError(e, OperationType.LIST, "projects");
        }
    }

    // 3. Old projects (Backward compatibility)
    let oldProjects: CloudProject[] = [];
    try {
        const oldProjectsRef = collection(db, "users", userId, "projects");
        const oldSnap = await getDocs(oldProjectsRef);
        oldProjects = oldSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), ownerId: userId } as any));
    } catch (e) {
        console.error("Error listing old projects:", e);
    }

    // Merge and remove duplicates by ID
    const all = [...ownerProjects, ...collProjects, ...oldProjects];
    const unique = Array.from(new Map(all.map(item => [item.id, item])).values());

    return unique;
};

export const updateCollaborators = async (projectId: string, collaborators: { [uid: string]: ProjectCollaborator | 'editor' | 'viewer' }) => {
    const projectRef = doc(db, "projects", projectId);
    // Extraemos las uids para facilitar la consulta en Firestore
    const collaboratorUids = Object.keys(collaborators);
    try {
        await setDoc(projectRef, {
            collaborators,
            collaboratorUids // Campo redundante para facilitar queries: where("collaboratorUids", "array-contains", userId)
        }, { merge: true });
    } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, `projects/${projectId}`);
    }
};

export const deleteProjectFromCloud = async (userId: string, projectId: string) => {
    // Delete from new location
    const projectRef = doc(db, "projects", projectId);
    try {
        await deleteDoc(projectRef);
    } catch (e) {
        handleFirestoreError(e, OperationType.DELETE, `projects/${projectId}`);
    }

    // Also try to delete from old location for cleanup
    const oldProjectRef = doc(db, "users", userId, "projects", projectId);
    try {
        await deleteDoc(oldProjectRef);
    } catch (e) {
        // Ignore errors if old project doesn't exist
    }
};
