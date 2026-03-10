import * as MediaLibrary from "expo-media-library";

export async function ensureMediaPermission() {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Permiso denegado para guardar en la galería.");
  }
}

export async function saveImageToAmedaAlbum(uri: string) {
  await ensureMediaPermission();

  const asset = await MediaLibrary.createAssetAsync(uri);
  const albumName = "Ameda";
  const existing = await MediaLibrary.getAlbumAsync(albumName);
  if (!existing) {
    await MediaLibrary.createAlbumAsync(albumName, asset, false);
    return;
  }
  await MediaLibrary.addAssetsToAlbumAsync([asset], existing, false);
}
