function normalizeFavorite(item) {
  const metadata = item.metadata || {};
  const isMusic = item.type === 'music';
  return {
    id: String(item.id),
    type: item.type || 'photo',
    title: item.title || '非遗创意作品',
    description: metadata.creativeDescription || (isMusic ? [metadata.genre, metadata.mood].filter(Boolean).join(' · ') : ''),
    mainImageUrl: isMusic ? '' : (item.imageUrl || item.image_url || ''),
    audioUrl: metadata.audioUrl || '',
    videoUrl: item.videoUrl || item.video_url || metadata.videoUrl || '',
    subImageUrls: [
      metadata.subImageUrl1,
      metadata.subImageUrl2,
      metadata.staticSubImageUrl1,
      metadata.staticSubImageUrl2
    ].filter(Boolean),
    createdAt: item.createdAt || item.created_at || new Date().toISOString(),
    metadata
  };
}

function normalizeMaterial(item) {
  return {
    id: String(item.id),
    type: item.type || 'image',
    sourceUrl: item.source_url || item.sourceUrl || '',
    title: item.title || '非遗素材',
    description: item.description || '',
    metadata: item.metadata || {},
    createdAt: item.created_at || item.createdAt || new Date().toISOString()
  };
}

function dateText(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function encodeParam(value) {
  return encodeURIComponent(value || '');
}

module.exports = {
  normalizeFavorite,
  normalizeMaterial,
  dateText,
  encodeParam
};
