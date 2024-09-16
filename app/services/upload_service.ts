import env from '#start/env'
import { v2 as cloudinary } from 'cloudinary'
// Configuration
cloudinary.config({
  cloud_name: env.get('CLOUDINARY_CLOUD_NAME'),
  api_key: env.get('CLOUDINARY_API_KEY'),
  api_secret: env.get('CLOUDINARY_API_SECRET'),
})

// Upload an image
export const uploadToCloudinary = async (path: string, folder: string) => {
  return await cloudinary.uploader
    .upload(path, {
      folder,
      width: 100,
      height: 100,
      crop: 'fill',
    })
    .then((data) => {
      return { url: data.secure_url, public_id: data.public_id }
    })
    .catch((error) => {
      console.log(error)
      return false
    })
}

export const removeFromCloudinary = async (public_id: string) => {
  await cloudinary.uploader.destroy(public_id, function (error, result) {
    console.log(result, error)
  })
}
