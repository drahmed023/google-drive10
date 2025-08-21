import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime: string
  webViewLink: string
  webContentLink?: string
  parents?: string[]
  iconLink?: string
}

interface DriveFolder {
  id: string
  name: string
  files: DriveFile[]
  folders: DriveFolder[]
}

async function fetchGoogleDriveFiles(folderId: string, apiKey: string): Promise<DriveFolder> {
  const baseUrl = 'https://www.googleapis.com/drive/v3/files'
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id,name,mimeType,size,modifiedTime,webViewLink,webContentLink,parents,iconLink)',
    key: apiKey
  })

  const response = await fetch(`${baseUrl}?${params}`)
  
  if (!response.ok) {
    throw new Error(`Google Drive API error: ${response.status} - ${response.statusText}`)
  }

  const data = await response.json()
  const files: DriveFile[] = []
  const subfolders: DriveFolder[] = []

  // Process each item
  for (const item of data.files || []) {
    if (item.mimeType === 'application/vnd.google-apps.folder') {
      // Recursively fetch subfolder contents
      try {
        const subfolder = await fetchGoogleDriveFiles(item.id, apiKey)
        subfolder.name = item.name
        subfolder.id = item.id
        subfolders.push(subfolder)
      } catch (error) {
        console.error(`Error fetching subfolder ${item.name}:`, error)
        // Add empty folder if there's an error
        subfolders.push({
          id: item.id,
          name: item.name,
          files: [],
          folders: []
        })
      }
    } else {
      files.push(item)
    }
  }

  return {
    id: folderId,
    name: '',
    files,
    folders: subfolders
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const folderId = url.searchParams.get('folderId') || '1gb2xHo-rr2OSIJHBsVxUGm01SLsyxgcV'
    
    // Use the provided API key
    const apiKey = 'AIzaSyCTgFxfWDk204M8eaPz_B_VWCVMLx6zuo0'
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Drive API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Fetching Google Drive files for folder: ${folderId}`)
    const driveData = await fetchGoogleDriveFiles(folderId, apiKey)
    
    return new Response(
      JSON.stringify(driveData),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error fetching Google Drive files:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to fetch Google Drive files. Please check the folder ID and API key.'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})