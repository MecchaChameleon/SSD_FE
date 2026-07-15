import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

const unsupportedPattern = /(?:image\/(?:hei[cf]|avif)|\.(?:hei[cf]|avif)(?:$|[?#]))/i;

export async function normalizePickedImage(asset: ImagePickerAsset): Promise<ImagePickerAsset> {
  const sourceType = asset.mimeType ?? '';
  const sourceName = asset.fileName ?? asset.uri;
  if (!unsupportedPattern.test(sourceType) && !unsupportedPattern.test(sourceName)) return asset;

  const context = ImageManipulator.manipulate(asset.uri);
  const rendered = await context.renderAsync();
  const converted = await rendered.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  const baseName = (asset.fileName ?? 'image').replace(/\.[^.]+$/, '') || 'image';
  const fileName = `${baseName}.jpg`;
  let file: File | undefined;

  if (Platform.OS === 'web' && typeof File !== 'undefined') {
    const blob = await fetch(converted.uri).then(response => response.blob());
    file = new File([blob], fileName, { type: 'image/jpeg' });
  }

  return {
    ...asset,
    uri: converted.uri,
    width: converted.width,
    height: converted.height,
    fileName,
    mimeType: 'image/jpeg',
    fileSize: file?.size,
    file,
  };
}

export async function normalizePickedImages(assets: ImagePickerAsset[]) {
  return Promise.all(assets.map(normalizePickedImage));
}
