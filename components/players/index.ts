/**
 * Video Player Components
 *
 * This file exports the MuxPlayer implementation based on Mux's official player component.
 *
 * You can use the player by importing it:
 * import { MuxPlayer } from "@/components/players";
 * import { Player } from "@/components/players"; // Default export
 */

// Export player implementations
export { MuxPlayerComponent as MuxPlayer } from "./player-mux";
export { VideoJsPlayerComponent as VideoJsPlayer } from "./player-videojs";
export { YouTubePlayerComponent as YouTubePlayer } from "./player-youtube";

// Default player: Video.js v10 for native (Mux HLS) playback, a real
// YouTube embed when the video is flipped to play from source.
export { SmartPlayer as Player } from "./player-smart";
