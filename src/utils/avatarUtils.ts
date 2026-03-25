// List of available avatar images
export const AVATARS = [
  'CatAvatar.png',
  'DogAvatar.png',
  'FoxAvatar.png',
  'GiraffeAvatar.png',
  'MantesAvatar.png',
  'OtterAvatar.png',
  'PandaAvatar.png',
  'PenguinAvatar.png',
  'RabbitAvatar.png',
  'TigerAvatar.png'
] as const;

export type AvatarType = typeof AVATARS[number];

// Default avatar (Panda)
export const DEFAULT_AVATAR: AvatarType = 'PandaAvatar.png';

/**
 * Get the full path to an avatar image
 */
export const getAvatarPath = (avatarName: string): string => {
  return `/AvatarImages/${avatarName}`;
};

/**
 * Get the user's selected avatar from server or localStorage, or return the default
 */
export const getUserAvatar = (serverAvatar?: string): string => {
  if (serverAvatar) return getAvatarPath(serverAvatar);
  if (typeof window === "undefined") return getAvatarPath(DEFAULT_AVATAR)
  const savedAvatar = localStorage.getItem("userAvatar")
  return savedAvatar ? getAvatarPath(savedAvatar) : getAvatarPath(DEFAULT_AVATAR)
}

export const saveUserAvatar = (avatarName: string): void => {
  if (typeof window !== "undefined") {
    localStorage.setItem("userAvatar", avatarName)
  }
}

export const getAvatarName = (serverAvatar?: string): string => {
  if (serverAvatar) return serverAvatar;
  if (typeof window === "undefined") return DEFAULT_AVATAR
  return localStorage.getItem("userAvatar") || DEFAULT_AVATAR
}