import { db } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { Asset, User } from './types';

export const saveAssetToFirebase = async (asset: Asset) => {
  const assetRef = doc(db, 'assets', asset.id);
  await setDoc(assetRef, asset);
};

export const deleteAssetFromFirebase = async (assetId: string) => {
  const assetRef = doc(db, 'assets', assetId);
  await setDoc(assetRef, { _deleted: true }, { merge: true }); // Soft delete or we can use deleteDoc
};

export const syncAllAssetsToFirebase = async (assets: Asset[]) => {
  const batch = writeBatch(db);
  assets.forEach((asset) => {
    const assetRef = doc(db, 'assets', asset.id);
    batch.set(assetRef, asset);
  });
  await batch.commit();
};

export const getAllAssetsFromFirebase = async (): Promise<Asset[]> => {
  const querySnapshot = await getDocs(collection(db, 'assets'));
  const assets: Asset[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data() as Asset;
    if (!(data as any)._deleted) {
      assets.push(data);
    }
  });
  return assets;
};

export const saveUserToFirebase = async (user: User) => {
  const userRef = doc(db, 'users', user.id);
  await setDoc(userRef, user);
};

export const deleteUserFromFirebase = async (userId: string) => {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, { _deleted: true }, { merge: true });
};

export const syncAllUsersToFirebase = async (users: User[]) => {
  const batch = writeBatch(db);
  users.forEach((user) => {
    const userRef = doc(db, 'users', user.id);
    batch.set(userRef, user);
  });
  await batch.commit();
};

export const getAllUsersFromFirebase = async (): Promise<User[]> => {
  const querySnapshot = await getDocs(collection(db, 'users'));
  const users: User[] = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data() as User;
    if (!(data as any)._deleted) {
      users.push(data);
    }
  });
  return users;
};
