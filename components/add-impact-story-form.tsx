
"use client"

import { useState } from "react"
import { supabase, isDemoMode } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Upload, X, ImageIcon } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
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

interface AddImpactStoryFormProps {
  category: 'water' | 'food_security' | 'beautification'
  onStoryAdded: (story: ImpactStory) => void
}

export function AddImpactStoryForm({ category, onStoryAdded }: AddImpactStoryFormProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    text: "",
  })
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

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
      // Get the highest display order for this category
      const { data: existingStories } = await supabase
        .from('impact_stories')
        .select('display_order')
        .eq('category', category)
        .order('display_order', { ascending: false })
        .limit(1)

      const nextOrder = existingStories && existingStories.length > 0
        ? (existingStories[0] as any).display_order + 1
        : 1

      // Upload media files
      let mediaUrls: string[] = []
      if (mediaFiles.length > 0) {
        setUploading(true)
        for (const file of mediaFiles) {
          try {
            const result = await uploadImageToSupabase(file, 'impact-stories')
            if (result.success && result.url) {
              mediaUrls.push(result.url)
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

      // Insert the story
      const { data, error } = await (supabase
        .from('impact_stories') as any)
        .insert([
          {
            title: formData.title,
            text: formData.text,
            media_urls: mediaUrls.length > 0 ? mediaUrls : null,
            category,
            display_order: nextOrder,
            is_published: true,
          }
        ])
        .select()
        .single()

      if (error) {
        throw error
      }

      onStoryAdded(data)
      
      // Reset form
      setFormData({ title: "", text: "" })
      setMediaFiles([])
      setOpen(false)

      toast({
        title: "Success",
        description: "Impact story added successfully",
      })

    } catch (error) {
      console.error('Error adding story:', error)
      toast({
        title: "Error",
        description: "Failed to add impact story",
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
    
    setMediaFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
  }

  const categoryLabels = {
    water: 'Water',
    food_security: 'Food Security',
    beautification: 'Beautification'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Story
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New {categoryLabels[category]} Story</DialogTitle>
          <DialogDescription>
            Create a new impact story for the {categoryLabels[category]} section
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter story title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="text">Story Content *</Label>
            <Textarea
              id="text"
              value={formData.text}
              onChange={(e) => setFormData(prev => ({ ...prev, text: e.target.value }))}
              placeholder="Write your impact story here... Include details about what was done and any testimonials."
              rows={6}
              required
            />
          </div>

          <div className="space-y-4">
            <Label>Media (Images/Videos)</Label>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
                id="media-upload"
              />
              <label htmlFor="media-upload" className="cursor-pointer">
                <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-600">
                  Click to upload images or videos
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Maximum 10MB per file
                </p>
              </label>
            </div>

            {mediaFiles.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files:</Label>
                <div className="space-y-2">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
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
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || uploading}>
              {loading ? "Adding..." : uploading ? "Uploading..." : "Add Story"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
