const ICH_TYPES = [
  { id: 'jingdezhen', name: '景德镇陶瓷' },
  { id: 'guqin', name: '古琴艺术' },
  { id: 'xiangyunsha', name: '香云纱' },
  { id: 'ru', name: '汝瓷' },
  { id: 'luban', name: '鲁班锁' },
  { id: 'silkworm', name: '桑蚕丝织技艺' },
  { id: 'paper-cut', name: '中国剪纸' },
  { id: 'taiji', name: '太极拳' },
  { id: 'jingju', name: '京剧' },
  { id: 'other', name: '其他' }
];

const PLAY_INTERACTIONS = [
  { id: 'craft', name: '工艺' },
  { id: 'visual', name: '视觉' },
  { id: 'auditory', name: '听觉' },
  { id: 'behavior', name: '行为' }
];

const PRODUCT_TYPES = [
  { id: 'poster', name: '海报' },
  { id: 'festival', name: '节日卡' },
  { id: 'birthday', name: '生日卡' },
  { id: 'newyear', name: '新年卡' },
  { id: 'dynamic', name: '动态海报' },
  { id: 'avatar', name: '数字人' },
  { id: 'interactive', name: '可交互文创产品' }
];

const TARGET_MARKETS = [
  { id: 'america', name: '美洲' },
  { id: 'europe', name: '欧洲' },
  { id: 'asia', name: '亚洲' },
  { id: 'oceania', name: '大洋洲' }
];

const USE_INTERACTIONS = [
  { id: 'chinese', name: '中国风' },
  { id: 'minimal', name: '简约' },
  { id: 'modern', name: '现代' },
  { id: 'traditional', name: '传统' },
  { id: 'luxury', name: '轻奢' }
];

const APPLICATION_SCENES = [
  { id: 'fashion', name: '时尚配饰' },
  { id: 'home', name: '家居装饰' },
  { id: 'art', name: '艺术品' },
  { id: 'gifts', name: '礼品' }
];

const GENRES = ['国风', '古风', '民谣', '中国戏曲', '传统民歌', '流行', '爵士', '古典', '国风电子', '国风摇滚'];
const MOODS = ['怀旧', '温暖', '浪漫', '梦幻', '欢乐', '伤感', '放松', '鼓舞', '壮丽', '抒情'];
const DURATIONS = [
  { label: '30秒', value: 30 },
  { label: '45秒', value: 45 },
  { label: '60秒', value: 60 },
  { label: '90秒', value: 90 }
];

module.exports = {
  ICH_TYPES,
  PLAY_INTERACTIONS,
  PRODUCT_TYPES,
  TARGET_MARKETS,
  USE_INTERACTIONS,
  APPLICATION_SCENES,
  GENRES,
  MOODS,
  DURATIONS
};
