const CLOUDINARY_BASE =
  "https://res.cloudinary.com/demfj39xl/image/upload/"

const FOLDER = "hanrui"

/**
 * 统一路径处理器（核心）
 * 支持：
 * /image/xxx.jpg
 * /public/xxx.jpg
 * /2024-x/xxx.jpg
 */
export function toCloudinary(path) {
  if (!path) return ""

  if (path.startsWith("http")) return path

  let cleanPath = path.startsWith("/") ? path.slice(1) : path

  // ⭐ 统一去掉 public（如果存在）
  if (cleanPath.startsWith("public/")) {
    cleanPath = cleanPath.replace("public/", "")
  }

  // ⭐ image 不动
  // ⭐ 2024-x 不动
  // ⭐ avatar.jpg 不动

  return `${CLOUDINARY_BASE}${FOLDER}/${cleanPath}`
}export { toCloudinary }
