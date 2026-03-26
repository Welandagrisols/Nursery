
"use client"

import { useState } from "react"
import { supabase, isDemoMode } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Edit, Upload, X, ImageIcon, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { uploadImageToSupabase } from "@/lib/image-upload"

interface ImpactStory {
  id: string
  title: string
  text: string
  media_urls: string[] | null
  category: 'water' | 'food_security' | 'beautification'
  display_order: number
  is_published: boolean
  created_at: string
  updated_at: string
}

interface EditImpactStoryFormProps {
  story: ImpactStory
  onStoryUpdated: (story: ImpactStory) => void
}

export function EditImpactStoryForm({ story, onStoryUpdated }: EditImpactStoryFormProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: story.title,
    text: story.text,
  })
  const [existingMediaUrls, setExistingMediaUrls] = useState<string[]>(story.media_urls || [])
  const [newMediaFiles, setNewMediaFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const { toast } = useToast()

  // Track changes to show unsaved indicator
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setHasUnsavedChanges(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isDemoMode) {
      toast({
        title: "Demo Mode",
        description: "Database features are not available in demo mode",
        variant: "destructive",
      })
      return
    }

    if (!formData.title.trim() || !formData.text.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    
    try {
      // Upload new media files
      let newMediaUrls: string[] = []
      if (newMediaFiles.length > 0) {
        setUploading(true)
        for (const file of newMediaFiles) {
          try {
            const result = await uploadImageToSupabase(file, 'impact-stories')
            if (result.success && result.url) {
              newMediaUrls.push(result.url)
            }
          } catch (error) {
            console.error('Error uploading file:', error)
            toast({
              title: "Warning",
              description: `Failed to upload ${file.name}`,
              variant: "destructive",
            })
          }
        }
        setUploading(false)
      }

      // Combine existing and new media URLs
      const allMediaUrls = [...existingMediaUrls, ...newMediaUrls]

      // Update the story
      const { data, error } = await (supabase
        .from('impact_stories') as any)
        .update({
          title: formData.title,
          text: formData.text,
          media_urls: allMediaUrls.length > 0 ? allMediaUrls : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', story.id)
        .select()
        .single()

      if (error) {
        throw error
      }

      onStoryUpdated(data)
      setHasUnsavedChanges(false)
      setOpen(false)

      toast({
        title: "Success",
        description: "Impact story updated successfully",
      })

    } catch (error) {
      console.error('Error updating story:', error)
      toast({
        title: "Error",
        description: "Failed to update impact story",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const isValidSize = file.size <= 10 * 1024 * 1024 // 10MB limit
      
      if (!isImage && !isVideo) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid image or video file`,
          variant: "destructive",
        })
        return false
      }
      
      if (!isValidSize) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 10MB`,
          variant: "destructive",
        })
        return false
      }
      
      return true
    })
    
    setNewMediaFiles(prev => [...prev, ...validFiles])
  }

  const removeExistingMedia = (index: number) => {
    setExistingMediaUrls(prev => prev.filter((_, i) => i !== index))
  }

  const removeNewFile = (index: number) => {
    setNewMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  const getFileNameFromUrl = (url: string) => {
    return url.split('/').pop() || 'Unknown file'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Edit Impact Story
            {hasUnsavedChanges && (
              <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                Unsaved changes
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Update the story details and media, then click "Save Changes" to apply your edits
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter story title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-text">Story Content *</Label>
            <Textarea
              id="edit-text"
              value={formData.text}
              onChange={(e) => handleInputChange('text', e.target.value)}
              placeholder="Write your impact story here..."
              rows={6}
              required
            />
          </div>

          <div className="space-y-4">
            <Label>Media (Images/Videos)</Label>
            
            {/* Existing Media */}
            {existingMediaUrls.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Current Media:</Label>
                <div className="space-y-2">
                  {existingMediaUrls.map((url, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        <span className="text-sm">{getFileNameFromUrl(url)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(url, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeExistingMedia(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New Media */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="edit-media-upload"
              />
              <label htmlFor="edit-media-upload" className="cursor-pointer">
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Add more images or videos
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum 10MB per file
                </p>
              </label>
            </div>

            {/* New Files */}
            {newMediaFiles.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">New Files to Upload:</Label>
                <div className="space-y-2">
                  {newMediaFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4" />
                        <span className="text-sm">{file.name}</span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNewFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t bg-gray-50 p-4 -mx-6 -mb-6 rounded-b-lg">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || uploading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6"
            >
              {loading ? "Saving Changes..." : uploading ? "Uploading Files..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
