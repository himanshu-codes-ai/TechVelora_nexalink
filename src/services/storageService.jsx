import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../config/firebase';

export async function uploadFile(path, file) {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  return url;
}

export async function uploadAvatar(userId, file) {
  return uploadFile(`avatars/${userId}/${Date.now()}_${file.name}`, file);
}

export async function uploadPostMedia(userId, file) {
  return uploadFile(`posts/${userId}/${Date.now()}_${file.name}`, file);
}

export async function uploadResume(userId, file) {
  return uploadFile(`resumes/${userId}/${Date.now()}_${file.name}`, file);
}

export async function uploadCompanyLogo(companyId, file) {
  return uploadFile(`companies/${companyId}/logo_${Date.now()}_${file.name}`, file);
}

export async function uploadEventImage(eventId, file) {
  return uploadFile(`events/${eventId}/${Date.now()}_${file.name}`, file);
}

export async function deleteFile(url) {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch (err) {
    console.error('Error deleting file:', err);
  }
}
