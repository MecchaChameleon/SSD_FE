import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const unsupportedPattern = /(?:image\/(?:hei[cf]|avif)|\.(?:hei[cf]|avif)(?:$|[?#]))/i;

export async function normalizePickedImage(asset: ImagePickerAsset): Promise<ImagePickerAsset> {
  const sourceInfo = [asset.mimeType, asset.fileName, asset.uri, asset.file?.type, asset.file?.name]
    .filter(Boolean)
    .join(' ');
  if (!unsupportedPattern.test(sourceInfo)) return asset;

  const context = ImageManipulator.manipulate(asset.uri);
  const rendered = await context.renderAsync();
  const converted = await rendered.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  const baseName = (asset.fileName ?? 'image').replace(/\.[^.]+$/, '') || 'image';
  const fileName = `${baseName}.jpg`;

  return {
    ...asset,
    uri: converted.uri,
    width: converted.width,
    height: converted.height,
    fileName,
    mimeType: 'image/jpeg',
    fileSize: undefined,
    file: undefined,
  };
}

export async function normalizePickedImages(assets: ImagePickerAsset[]) {
  return Promise.all(assets.map(normalizePickedImage));
}
