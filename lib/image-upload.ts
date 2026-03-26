
import { supabase } from './supabase'

export interface ImageUploadResult {
  success: boolean
  url?: string
  error?: string
  filePath?: string
}

/**
 * Upload a media file (image or video) to Supabase Storage with public access
 * @param file - The media file to upload
 * @param folder - Optional folder within plant-images bucket (defaults to 'plants')
 * @returns Promise with upload result
 */
export async function uploadImageToSupabase(
  file: File, 
  folder: string = 'plants'
): Promise<ImageUploadResult> {
  try {
    // Validate file type (images and videos)
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    
    if (!isImage && !isVideo) {
      return {
        success: false,
        error: 'File must be an image or video'
      }
    }

    // Validate file size (10MB limit for videos, 5MB for images)
    const maxSize = isVideo ? 10 * 1024 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      const sizeLimit = isVideo ? '10MB' : '5MB'
      return {
        success: false,
        error: `${isVideo ? 'Video' : 'Image'} must be smaller than ${sizeLimit}`
      }
    }

    // Create unique filename with timestamp and random string
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 8)
    const fileName = `${timestamp}-${randomString}.${fileExt}`
    const filePath = `${folder}/${fileName}`

    console.log('Uploading image to Supabase Storage:', filePath)

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('plant-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (error) {
      console.error('Supabase upload error:', error)
      return {
        success: false,
        error: `Upload failed: ${error.message}`
      }
    }

    console.log('Upload successful:', data)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('plant-images')
      .getPublicUrl(filePath)

    console.log('Generated public URL:', publicUrl)

    return {
      success: true,
      url: publicUrl,
      filePath: filePath
    }

  } catch (error: any) {
    console.error('Image upload error:', error)
    return {
      success: false,
      error: `Upload failed: ${error.message || 'Unknown error'}`
    }
  }
}

/**
 * Delete an image from Supabase Storage
 * @param filePath - The path of the file to delete
 * @returns Promise with deletion result
 */
export async function deleteImageFromSupabase(filePath: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('plant-images')
      .remove([filePath])

    if (error) {
      console.error('Error deleting image:', error)
      return false
    }

    console.log('Image deleted successfully:', filePath)
    return true
  } catch (error) {
    console.error('Error deleting image:', error)
    return false
  }
}

/**
 * Upload an image and associate it with an inventory item
 * @param file - The image file to upload
 * @param inventoryId - The ID of the inventory item to associate with
 * @param folder - Optional folder within plant-images bucket (defaults to 'plants')
 * @returns Promise with upload result
 */
export async function uploadImageAndLinkToInventory(
  file: File,
  inventoryId: string,
  folder: string = 'plants'
): Promise<ImageUploadResult> {
  try {
    // First upload the image
    const uploadResult = await uploadImageToSupabase(file, folder)
    
    if (!uploadResult.success || !uploadResult.url) {
      return uploadResult
    }

    // Then update the inventory item with the image URL
    const { error: updateError } = await (supabase.from('inventory') as any)
      .update({ 
        image_url: uploadResult.url,
        updated_at: new Date().toISOString()
      })
      .eq('id', inventoryId)

    if (updateError) {
      console.error('Error linking image to inventory:', updateError)
      // Try to clean up the uploaded image if inventory update fails
      if (uploadResult.filePath) {
        await deleteImageFromSupabase(uploadResult.filePath)
      }
      return {
        success: false,
        error: `Image uploaded but failed to link to product: ${updateError.message}`
      }
    }

    console.log('Successfully linked image to inventory item:', inventoryId)
    return {
      success: true,
      url: uploadResult.url,
      filePath: uploadResult.filePath
    }

  } catch (error: any) {
    console.error('Error uploading and linking image:', error)
    return {
      success: false,
      error: `Failed to upload and link image: ${error.message || 'Unknown error'}`
    }
  }
}

/**
 * Check if the plant-images bucket exists and is accessible
 * @returns Promise with bucket status
 */
export async function checkStorageBucket(): Promise<{
  exists: boolean
  accessible: boolean
  error?: string
}> {
  try {
    // Try to list buckets
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      return {
        exists: false,
        accessible: false,
        error: `Cannot access storage: ${listError.message}`
      }
    }

    const plantImagesBucket = buckets?.find(bucket => bucket.id === 'plant-images')

    if (!plantImagesBucket) {
      return {
        exists: false,
        accessible: false,
        error: 'plant-images bucket not found'
      }
    }

    // Test upload permission with a small test file
    const testFileName = `test-${Date.now()}.txt`
    const testContent = 'test'
    
    const { error: uploadError } = await supabase.storage
      .from('plant-images')
      .upload(`test/${testFileName}`, new Blob([testContent], { type: 'text/plain' }))

    if (uploadError) {
      return {
        exists: true,
        accessible: false,
        error: `Upload test failed: ${uploadError.message}`
      }
    }

    // Clean up test file
    await supabase.storage
      .from('plant-images')
      .remove([`test/${testFileName}`])

    return {
      exists: true,
      accessible: true
    }

  } catch (error: any) {
    return {
      exists: false,
      accessible: false,
      error: `Storage check failed: ${error.message}`
    }
  }
}
