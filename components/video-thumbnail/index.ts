export { VideoThumbnail } from './video-thumbnail';
export { ThumbnailImage } from './thumbnail-image';

// Smart component that auto-detects progress context
import { VideoThumbnailWithProgress } from './with-progress';

// Make VideoThumbnail the "smart" default that just works
export default VideoThumbnailWithProgress;
