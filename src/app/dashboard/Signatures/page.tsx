'use client';
import React, { useRef, useState, useEffect } from 'react';
import { message, Spin, Button, Upload } from 'antd';
import { UploadOutlined } from '@ant-design/icons'; 
import type { RcFile, UploadProps } from 'antd/es/upload/interface'; 
import { getUserSignatures, uploadSignature, deleteSignature, SignatureData } from '@/utils/api'; 

function dataURLtoFile(dataurl: string, filename: string): File | null {
    try {
        const arr = dataurl.split(',');
        if (!arr[0]) return null;
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch || mimeMatch.length < 2) return null;
        const mime = mimeMatch[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, {type:mime});
    } catch (e) {
        console.error("Error converting data URL to File:", e);
        return null;
    }
}

export default function SignaturesPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatures, setSignatures] = useState<SignatureData[]>([]);
  const [isSavingCanvas, setIsSavingCanvas] = useState(false); 
  const [isUploadingFile, setIsUploadingFile] = useState(false); 
  const [selectedFile, setSelectedFile] = useState<RcFile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load signatures from database instead of localStorage
  useEffect(() => {
    loadSignatures();
  }, []);

  const loadSignatures = async () => {
    try {
      setIsLoading(true);
      const signaturesFromDB = await getUserSignatures();
      setSignatures(signaturesFromDB);
    } catch (error: any) {
      console.error("Error loading signatures from database:", error);
      message.error(error.message || 'İmzaları yükləyərkən xəta baş verdi.');
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare canvas (Keep this as it is)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = 'black';
      }
    }
  }, []);

  // --- Drawing functions (Keep these as they are) ---
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => { setIsDrawing(true); const canvas = canvasRef.current; if (canvas) { const ctx = canvas.getContext('2d'); if (ctx) { const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; ctx.beginPath(); ctx.moveTo(x, y); } } };
  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => { if (!isDrawing) return; const canvas = canvasRef.current; if (canvas) { const ctx = canvas.getContext('2d'); if (ctx) { const rect = canvas.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top; ctx.lineTo(x, y); ctx.stroke(); } } };
  const stopDrawing = () => { setIsDrawing(false); const canvas = canvasRef.current; if (canvas) { const ctx = canvas.getContext('2d'); if (ctx) { ctx.closePath(); } } };
  const clearCanvas = () => { const canvas = canvasRef.current; if (canvas) { const ctx = canvas.getContext('2d'); if (ctx) { ctx.clearRect(0, 0, canvas.width, canvas.height); } } };

  // --- Save Drawn Signature - Updated to use API ---
  const saveDrawnSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check if canvas is empty (Keep this check)
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let isCanvasEmpty = true;
        for (let i = 3; i < imageData.data.length; i += 4) {
            if (imageData.data[i] !== 0) {
                isCanvasEmpty = false;
                break;
            }
        }
        if (isCanvasEmpty) {
            message.warning('Please draw a signature before saving.');
            return;
        }
    }

    setIsSavingCanvas(true);
    message.loading({ content: 'Saving drawn signature...', key: 'savingCanvasSig' });

    try {
        const dataUrl = canvas.toDataURL('image/png');
        const filename = `signature-drawn-${Date.now()}.png`;
        const signatureFile = dataURLtoFile(dataUrl, filename);

        if (!signatureFile) {
            throw new Error('Could not convert canvas to file.');
        }

        // Upload using the new API
        const newSignature = await uploadSignature(signatureFile, 'drawn');

        // Update signatures list
        setSignatures(prev => [newSignature, ...prev]);

        message.success({ content: 'Drawn signature saved successfully!', key: 'savingCanvasSig', duration: 2 });
        clearCanvas();

    } catch (error: any) {
        console.error('Error saving drawn signature:', error);
        message.error({ content: error.message || 'Error saving drawn signature', key: 'savingCanvasSig', duration: 4 });
    } finally {
        setIsSavingCanvas(false);
    }
  };

  // --- Handle File Upload - Updated to use API ---
  const handleFileUpload = async () => {
    if (!selectedFile) {
        message.warning('Please select a signature file to upload.');
        return;
    }

    setIsUploadingFile(true);
    message.loading({ content: 'Uploading signature file...', key: 'uploadingFileSig' });

    try {
        // Upload using the new API
        const newSignature = await uploadSignature(selectedFile, 'uploaded');

        // Update signatures list
        setSignatures(prev => [newSignature, ...prev]);

        message.success({ content: 'Signature file uploaded successfully!', key: 'uploadingFileSig', duration: 2 });
        setSelectedFile(null); // Clear the selected file state

    } catch (error: any) {
        console.error('Error uploading signature file:', error);
        message.error({ content: error.message || 'Error uploading signature file', key: 'uploadingFileSig', duration: 4 });
    } finally {
        setIsUploadingFile(false);
    }
  };

  // --- Ant Design Upload component props ---
  const uploadProps: UploadProps = {
    name: 'signatureFile',
    accept: 'image/png, image/jpeg, image/jpg, image/gif',
    multiple: false,
    beforeUpload: (file) => {
      setSelectedFile(file);
      return false;
    },
    onRemove: () => {
      setSelectedFile(null);
    },
    fileList: selectedFile ? [selectedFile] : [],
  };

  // --- Delete Signature - Updated to use API ---
  const deleteSignatureHandler = async (id: string) => {
    try {
      await deleteSignature(id);
      
      // Update signatures list
      setSignatures(prev => prev.filter(sig => sig.id !== id));
      
      message.success('Signature deleted successfully.');
    } catch (error: any) {
      console.error('Error deleting signature:', error);
      message.error(error.message || 'Error deleting signature.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Create and Manage Signatures</h1>

      {/* --- Section 1: Draw Signature --- */}
      <div className="mb-8 p-4 border rounded-md shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Option 1: Draw Your Signature</h2>
        <canvas
          ref={canvasRef} width={400} height={200}
          className="border border-gray-300 rounded-md bg-white cursor-crosshair"
          onMouseDown={startDrawing} onMouseMove={draw}
          onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
        />
        <div className="mt-4 flex gap-2">
          <Button onClick={clearCanvas} disabled={isSavingCanvas || isUploadingFile}>Clear</Button>
          <Button
             type="primary"
             onClick={saveDrawnSignature}
             loading={isSavingCanvas}
             disabled={isUploadingFile}
           >
            Save Drawn Signature
          </Button>
        </div>
      </div>

      {/* --- Section 2: Upload Signature File --- */}
      <div className="mb-8 p-4 border rounded-md shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Option 2: Upload Signature File</h2>
          <div className="flex items-center gap-4">
              <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />} disabled={isSavingCanvas || isUploadingFile}>
                      Select File
                  </Button>
              </Upload>
              <Button
                  type="primary"
                  onClick={handleFileUpload}
                  disabled={!selectedFile || isSavingCanvas}
                  loading={isUploadingFile}
              >
                  Upload Selected Signature
              </Button>
          </div>
          {selectedFile && <p className="text-sm text-gray-600 mt-2">Selected: {selectedFile.name}</p>}
      </div>

      {/* --- Section 3: Saved Signatures --- */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Saved Signatures</h2>
        {signatures.length === 0 ? (
          <p className="text-gray-500">No signatures saved yet. Draw or upload one!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {signatures.map(sig => (
              <div key={sig.id} className="border p-2 rounded-md flex flex-col items-center justify-between bg-white shadow hover:shadow-md transition-shadow">
                <img
                  src={sig.publicUrl}
                  alt="Saved Signature"
                  className="h-20 w-full object-contain mb-2 bg-gray-50 p-1 rounded"
                 />
                 <div className='text-center w-full'>
                     <p className="text-xs text-gray-500 mb-1 break-words" title={new Date(sig.createdAt).toLocaleString()}>
                        {new Date(sig.createdAt).toLocaleDateString()}
                     </p>
                     <p className="text-xs text-blue-600 mb-2 capitalize">
                        {sig.signatureType === 'drawn' ? 'Drawn' : 'Uploaded'}
                     </p>
                     <Button
                        danger
                        size="small"
                        onClick={() => deleteSignatureHandler(sig.id)}
                        disabled={isSavingCanvas || isUploadingFile}
                     >
                        Delete
                    </Button>
                 </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}