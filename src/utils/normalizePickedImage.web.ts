import type { ImagePickerAsset } from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import heic2any from 'heic2any';

const heicPattern = /(?:image\/hei[cf]|\.(?:hei[cf])(?:$|[?#]))/i;
const avifPattern = /(?:image\/avif|\.avif(?:$|[?#]))/i;

const sourceInfo = (asset: ImagePickerAsset) =>
  [asset.mimeType, asset.fileName, asset.uri, asset.file?.type, asset.file?.name]
    .filter(Boolean)
    .join(' ');

async function assetBlob(asset: ImagePickerAsset): Promise<Blob> {
  if (asset.file instanceof Blob) return asset.file;
  const response = await fetch(asset.uri);
  if (!response.ok) throw new Error('선택한 이미지 원본을 읽지 못했습니다.');
  return response.blob();
}

async function isHeicBlob(blob: Blob) {
  const header = new Uint8Array(await blob.slice(0, 16).arrayBuffer());
  if (header.length < 12) return false;
  const brand = String.fromCharCode(...header.slice(4, 12)).toLowerCase();
  return brand.startsWith('ftyp') && /hei[cf-]|heix|hevc|hevx|mif1|msf1/.test(brand.slice(4));
}

function jpegName(asset: ImagePickerAsset) {
  const original = asset.fileName ?? asset.file?.name ?? 'image';
  return `${original.replace(/\.[^.]+$/, '') || 'image'}.jpg`;
}

async function convertHeic(asset: ImagePickerAsset, blob: Blob): Promise<ImagePickerAsset> {
  const result = await heic2any({ blob, toType: 'image/jpeg', quality: 0.85 });
  const jpegBlob = Array.isArray(result) ? result[0] : result;
  if (!jpegBlob) throw new Error('HEIC 변환 결과가 비어 있습니다.');
  const fileName = jpegName(asset);
  const file = new File([jpegBlob], fileName, { type: 'image/jpeg' });

  return {
    ...asset,
    uri: URL.createObjectURL(file),
    fileName,
    mimeType: 'image/jpeg',
    fileSize: file.size,
    file,
  };
}

async function convertAvif(asset: ImagePickerAsset): Promise<ImagePickerAsset> {
  const rendered = await ImageManipulator.manipulate(asset.uri).renderAsync();
  const converted = await rendered.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  const fileName = jpegName(asset);
  const blob = await fetch(converted.uri).then(response => response.blob());
  const file = new File([blob], fileName, { type: 'image/jpeg' });
  return {
    ...asset,
    uri: converted.uri,
    width: converted.width,
    height: converted.height,
    fileName,
    mimeType: 'image/jpeg',
    fileSize: file.size,
    file,
  };
}

export async function normalizePickedImage(asset: ImagePickerAsset): Promise<ImagePickerAsset> {
  const info = sourceInfo(asset);
  if (avifPattern.test(info)) return convertAvif(asset);

  const declaredHeic = heicPattern.test(info);
  const blob = await assetBlob(asset);
  if (!declaredHeic && !(await isHeicBlob(blob))) return asset;
  return convertHeic(asset, blob);
}

export async function normalizePickedImages(assets: ImagePickerAsset[]) {
  return Promise.all(assets.map(normalizePickedImage));
}
