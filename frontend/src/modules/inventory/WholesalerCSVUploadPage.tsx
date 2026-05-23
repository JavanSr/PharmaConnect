import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, Download, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNotificationStore } from '@/stores/notificationStore';

interface UploadResult {
  imported: number;
  itemCount: number;
  results: Array<{ success: boolean; row: number; message: string }>;
}

const CSV_TEMPLATE = `wholesaler_name,product_name,unit_price,generic_name,strength,dosage_form,quantity
Shelys Pharma Ltd,Amoxicillin 500mg,15000,Amoxicillin,500mg,CAPSULE,1000
Shelys Pharma Ltd,Amoxicillin 250mg,8000,Amoxicillin,250mg,CAPSULE,800
Shelys Pharma Ltd,Paracetamol 500mg,8000,Paracetamol,500mg,TABLET,500
Cipla Tanzania,Ciprofloxacin 500mg,25000,Ciprofloxacin,500mg,TABLET,600
Cipla Tanzania,Metformin 500mg,12000,Metformin,500mg,TABLET,1200`;

export const WholesalerCSVUploadPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const toast = useNotificationStore((s) => s.toast);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return api.post('/suppliers/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data.data as UploadResult);
    },
    onSuccess: (data) => {
      toast.success(`Successfully imported ${data.imported} wholesalers with ${data.itemCount} products`);
      setFile(null);
      setPreview('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (e: any) => {
      toast.error(e.response?.data?.error || 'Failed to upload CSV');
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n').slice(0, 6);
      setPreview(lines.join('\n'));
    };
    reader.readAsText(selectedFile);
  };

  const handleUpload = () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    uploadMutation.mutate(formData);
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'wholesaler-template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div>
        <Link
          to="/inventory"
          className="mb-2 inline-flex items-center gap-1 text-sm text-[#1A6B5C] hover:underline"
        >
          <ArrowLeft size={14} /> Back to inventory
        </Link>
        <h1 className="text-2xl font-bold text-[#0D4035]">Upload Wholesaler Catalogue</h1>
        <p className="mt-1 text-sm text-[#64748B]">Import wholesalers and their products from CSV</p>
      </div>

      <Card className="border-2 border-dashed border-[#D6F0E8] bg-[#F8FCFA] p-6">
        <div className="text-center">
          <Upload size={32} className="mx-auto mb-3 text-[#1A6B5C]" />
          <p className="font-semibold text-[#0D4035] mb-1">Drag and drop your CSV file</p>
          <p className="text-xs text-[#64748B] mb-4">or click to browse</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Select CSV File
          </Button>
        </div>

        {file && (
          <div className="mt-4 pt-4 border-t border-[#D6F0E8]">
            <p className="text-sm font-semibold text-[#0D4035] mb-2">Selected file: {file.name}</p>
            {preview && (
              <div className="bg-white border border-[#D6F0E8] rounded p-3 text-xs font-mono text-[#64748B] overflow-x-auto max-h-40">
                <pre>{preview}</pre>
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="flex gap-2">
        <Button
          onClick={handleUpload}
          loading={uploadMutation.isPending}
          disabled={!file}
        >
          Upload CSV
        </Button>
        <Button
          variant="secondary"
          leftIcon={<Download size={16} />}
          onClick={downloadTemplate}
        >
          Download Template
        </Button>
      </div>

      <Card>
        <div className="space-y-3">
          <h3 className="font-semibold text-[#0D4035]">CSV Format Requirements</h3>
          <div className="text-sm text-[#64748B] space-y-2">
            <p><strong>Required columns:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><code className="bg-[#EDF7F3] px-1 py-0.5 rounded text-xs">wholesaler_name</code> — Name of the wholesale pharmacy</li>
              <li><code className="bg-[#EDF7F3] px-1 py-0.5 rounded text-xs">product_name</code> — Brand/product name</li>
              <li><code className="bg-[#EDF7F3] px-1 py-0.5 rounded text-xs">unit_price</code> — Price per unit (numeric)</li>
            </ul>

            <p className="mt-3"><strong>Optional columns:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><code className="bg-[#EDF7F3] px-1 py-0.5 rounded text-xs">generic_name</code> — Generic/INN name</li>
              <li><code className="bg-[#EDF7F3] px-1 py-0.5 rounded text-xs">strength</code> — e.g. "500mg", "250mg/5ml"</li>
              <li><code className="bg-[#EDF7F3] px-1 py-0.5 rounded text-xs">dosage_form</code> — TABLET, CAPSULE, SYRUP, INJECTION, etc.</li>
              <li><code className="bg-[#EDF7F3] px-1 py-0.5 rounded text-xs">quantity</code> — Units available</li>
            </ul>

            <p className="mt-3"><strong>Tips:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Use UTF-8 encoding</li>
              <li>Enclose values with commas in quotes</li>
              <li>Same wholesaler name will group products together</li>
              <li>Existing products for a wholesaler will be replaced</li>
            </ul>
          </div>
        </div>
      </Card>

      {uploadMutation.data && (
        <Card className="border-[#16a766] bg-[#F0FDF4]">
          <div className="flex gap-3">
            <CheckCircle size={20} className="text-[#16a766] flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#0D4035]">Upload successful!</p>
              <p className="text-sm text-[#64748B] mt-1">
                Imported {uploadMutation.data.imported} wholesalers with {uploadMutation.data.itemCount} total products
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
