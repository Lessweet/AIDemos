'use client';

import { useState, useRef, DragEvent } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  label?: string;
  description?: string;
}

export default function FileUpload({
  onFileSelect,
  accept = '.pdf',
  label = '上传文件',
  description = '支持 PDF 格式'
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file: File) => {
    setFileName(file.name);
    onFileSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative cursor-pointer
        border-2 border-dashed rounded-[24px]
        p-12 text-center
        transition-all duration-300 ease-in-out
        ${isDragging
          ? 'border-black bg-gray-50 scale-[1.02]'
          : 'border-black/30 hover:border-black hover:bg-gray-50'
        }
        ${fileName ? 'bg-gray-50' : ''}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4">
        {/* 上传图标 */}
        <div className={`
          w-16 h-16 rounded-full border-2 border-black
          flex items-center justify-center
          transition-all duration-300
          ${isDragging ? 'bg-black text-white' : 'bg-white'}
        `}>
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        {/* 文字提示 */}
        {fileName ? (
          <div className="animate-fadeIn">
            <p className="text-lg font-medium text-black">{fileName}</p>
            <p className="text-sm text-gray-500 mt-1">点击重新选择</p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium text-black">{label}</p>
            <p className="text-sm text-gray-500 mt-1">
              拖拽文件到此处，或点击选择
            </p>
            <p className="text-xs text-gray-400 mt-2">{description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
