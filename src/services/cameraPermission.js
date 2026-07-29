import { Camera } from "expo-camera";

let cachedPermission = null;
let preloadPromise = null;

export function rememberCameraPermission(permission) {
  if (permission) cachedPermission = permission;
  return permission;
}

export function getCachedCameraPermission() {
  return cachedPermission;
}

export function preloadCameraPermission() {
  if (!preloadPromise) {
    preloadPromise = Camera.getCameraPermissionsAsync()
      .then(rememberCameraPermission)
      .catch(() => null)
      .finally(() => {
        preloadPromise = null;
      });
  }
  return preloadPromise;
}
