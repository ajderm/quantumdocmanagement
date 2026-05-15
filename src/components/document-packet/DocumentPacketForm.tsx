import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Upload, FileText, Image, File, Trash2, GripVertical, ChevronUp, ChevronDown, Loader2, AlertCircle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PacketFile {
  id: string;
  name: string;
  type: string;
  size: number;
  storagePath: string;
  order: number;
  uploadedAt: string;
}

interface PacketConfig {
  files: PacketFile[];
  title?: string;
  includeCoverPage?: boolean;
  includePageNumbers?: boolean;
}

interface DocumentPacketFormProps {
  portalId: string;
  dealId: string;
  dealName?: string;
  companyName?: string;
  hubspotToken?: string;
  savedConfig?: PacketConfig;
  onFormChange?: (data: PacketConfig) => void;
  onAddFile?: (file: { name: string; storagePath: string; type: string; size: number }) => void; // Called by other forms to push PDFs here
}

const ACCEPTED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_FILES = 20;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentPacketForm({
  portalId,
  dealId,
  dealName,
  companyName,
  hubspotToken,
  savedConfig,
  onFormChange,
  onAddFile,
}: DocumentPacketFormProps) {
  const [files, setFiles] = useState<PacketFile[]>(savedConfig?.files || []);
  const [title, setTitle] = useState(savedConfig?.title || "Document Packet");
  const [includeCoverPage, setIncludeCoverPage] = useState(savedConfig?.includeCoverPage ?? false);
  const [includePageNumbers, setIncludePageNumbers] = useState(savedConfig?.includePageNumbers ?? true);
  const [uploading, setUploading] = useState(false);
  const [compiling, setCompiling] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notify parent of changes
  useEffect(() => {
    onFormChange?.({ files, title, includeCoverPage, includePageNumbers });
  }, [files, title, includeCoverPage, includePageNumbers]);

  const uploadFiles = async (newFiles: File[]) => {
    if (files.length + newFiles.length > MAX_FILES) {
      toast.error(`Maximum ${MAX_FILES} files allowed. You have ${files.length}, trying to add ${newFiles.length}.`);
      return;
    }

    const validFiles: File[] = [];
    for (const file of newFiles) {
      const fileType = ACCEPTED_TYPES[file.type];
      if (!fileType) {
        toast.error(`${file.name}: Unsupported file type. Use PDF, DOCX, PNG, or JPG.`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File too large (${formatFileSize(file.size)}). Max 25MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setUploading(true);
    const uploadedFiles: PacketFile[] = [];

    for (const file of validFiles) {
      try {
        const fd = new FormData();
        fd.append('action', 'upload');
        fd.append('folder', 'document-packets');
        fd.append('portalId', portalId);
        fd.append('dealId', dealId);
        fd.append('file', file);
        const { data, error: uploadError } = await supabase.functions.invoke('company-asset-upload', { body: fd });

        if (uploadError || !data?.path) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        uploadedFiles.push({
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          type: ACCEPTED_TYPES[file.type] || file.name.split('.').pop()?.toLowerCase() || 'pdf',
          size: file.size,
          storagePath: data.path,
          order: files.length + uploadedFiles.length,
          uploadedAt: new Date().toISOString(),
        });
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (uploadedFiles.length > 0) {
      setFiles(prev => [...prev, ...uploadedFiles]);
      toast.success(`Uploaded ${uploadedFiles.length} file${uploadedFiles.length > 1 ? 's' : ''}`);
    }
    setUploading(false);
  };

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    if (dragSourceIndex !== null) return; // Ignore reorder drops on upload zone
    const droppedFiles = Array.from(e.dataTransfer.files);
    await uploadFiles(droppedFiles);
  }, [dragSourceIndex, files, portalId, dealId]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await uploadFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  }, [files, portalId, dealId]);

  const removeFile = async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('action', 'delete');
      fd.append('folder', 'document-packets');
      fd.append('portalId', portalId);
      fd.append('dealId', dealId);
      fd.append('path', file.storagePath);
      await supabase.functions.invoke('company-asset-upload', { body: fd });
    } catch { /* continue */ }
    setFiles(prev => prev.filter(f => f.id !== fileId).map((f, i) => ({ ...f, order: i })));
  };

  const moveFile = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= files.length) return;
    const updated = [...files];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setFiles(updated.map((f, i) => ({ ...f, order: i })));
  };

  // Drag reorder handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragSourceIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragSourceIndex !== null) setDragOverIndex(index);
  };

  const handleReorderDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    if (dragSourceIndex !== null && dragSourceIndex !== toIndex) {
      moveFile(dragSourceIndex, toIndex);
    }
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragSourceIndex(null);
    setDragOverIndex(null);
  };

  const compilePacket = async () => {
    if (files.length === 0) { toast.error('No files to compile'); return; }

    setCompiling(true);
    try {
      const { data, error } = await supabase.functions.invoke('compile-document-packet', {
        body: {
          portalId, dealId,
          files: files.map(f => ({ storagePath: f.storagePath, type: f.type, name: f.name, order: f.order })),
          title, includeCoverPage, includePageNumbers, dealName, companyName,
        },
      });

      if (error) throw error;

      if (data?.pdfUrl) {
        try {
          const pdfResponse = await fetch(data.pdfUrl);
          const pdfBlob = await pdfResponse.blob();
          const blobUrl = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = blobUrl;
          const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);

          // Attach compiled PDF to HubSpot deal
          if (hubspotToken && dealId) {
            try {
              const { error: attachError } = await supabase.functions.invoke('hubspot-attach-file', {
                body: {
                  token: hubspotToken,
                  dealId,
                  fileUrl: data.pdfUrl,
                  fileName,
                },
              });
              if (!attachError) {
                toast.success('Attached to HubSpot deal');
              }
            } catch {
              // Silent failure - download already succeeded
              console.warn('Failed to attach to HubSpot, but PDF was downloaded');
            }
          }
        } catch {
          window.open(data.pdfUrl, '_blank');
        }
        toast.success('Document packet compiled');
        if (data.errors?.length) {
          data.errors.forEach((err: string) => toast.warning(err));
        }
      } else if (data?.error) {
        toast.error(data.error);
      }
    } catch (err) {
      toast.error('Failed to compile document packet');
      console.error('Compile error:', err);
    } finally {
      setCompiling(false);
    }
  };

  const typeBadgeColor = (type: string): string => {
    switch (type) {
      case 'pdf': return 'bg-red-100 text-red-700 border-red-200';
      case 'docx': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'png': case 'jpg': case 'jpeg': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const FileIcon = ({ type }: { type: string }) => {
    const icons: Record<string, typeof FileText> = { pdf: FileText, docx: File, png: Image, jpg: Image, jpeg: Image };
    const Icon = icons[type] || File;
    return <Icon className="h-4 w-4 shrink-0" />;
  };

  return (
    <div className="space-y-4">
      {/* Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Document Packet Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Packet Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document Packet" className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={includeCoverPage} onCheckedChange={setIncludeCoverPage} />
              Include cover page
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={includePageNumbers} onCheckedChange={setIncludePageNumbers} />
              Page numbers
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Upload Zone */}
      <Card>
        <CardContent className="pt-6">
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              uploading ? 'border-primary/40 bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
          >
            <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.png,.jpg,.jpeg" className="hidden" onChange={handleFileSelect} />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">Drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground">PDF, DOCX, PNG, JPG - Max 25MB each, up to {MAX_FILES} files</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => fileInputRef.current?.click()}>
                  Browse Files
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              <span>Files ({files.length})</span>
              <span className="text-xs text-muted-foreground font-normal">Drag to reorder</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {files.map((file, index) => (
              <div
                key={file.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleReorderDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all ${
                  dragSourceIndex === index ? 'opacity-40 border-primary bg-primary/5' :
                  dragOverIndex === index ? 'border-primary bg-primary/10' :
                  'border-transparent hover:bg-muted/50'
                }`}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/40 cursor-grab shrink-0" />
                <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{index + 1}</span>
                <FileIcon type={file.type} />
                <span className="text-sm truncate flex-1">{file.name}</span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeBadgeColor(file.type)}`}>
                  {file.type.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={index === 0} onClick={() => moveFile(index, index - 1)}>
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={index === files.length - 1} onClick={() => moveFile(index, index + 1)}>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive" onClick={() => removeFile(file.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Compile Button */}
      {files.length > 0 && (
        <Button onClick={compilePacket} disabled={compiling || files.length === 0} className="w-full" size="lg">
          {compiling ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Compiling {files.length} file{files.length > 1 ? 's' : ''}...</>
          ) : (
            <><Package className="h-4 w-4 mr-2" />Compile Document Packet ({files.length} file{files.length > 1 ? 's' : ''})</>
          )}
        </Button>
      )}

      {/* Empty State */}
      {files.length === 0 && !uploading && (
        <div className="text-center py-4 text-sm text-muted-foreground">
          <AlertCircle className="h-5 w-5 mx-auto mb-2 text-muted-foreground/40" />
          Upload documents to create a compiled packet PDF
        </div>
      )}
    </div>
  );
}
