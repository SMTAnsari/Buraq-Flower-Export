import React, { useState, useRef } from 'react';
import api from '../services/api';

/* ── Single image uploader (existing behaviour) ── */
const SingleUploader = ({ currentImage, onUpload, disabled }) => {
  const [preview, setPreview]   = useState(currentImage || '');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]  = useState(false);
  const inputRef = useRef();

  React.useEffect(() => { setPreview(currentImage || ''); }, [currentImage]);

  const handleFile = async (file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) { alert('Only JPG, PNG, and WebP images are allowed.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image must be under 5MB.'); return; }
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/upload/product', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUpload(res.data.imageUrl);
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed. Please try again.');
      setPreview(currentImage || '');
    } finally { setUploading(false); }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };
  const handleRemove = () => { setPreview(''); onUpload(''); if (inputRef.current) inputRef.current.value = ''; };

  return (
    <div className="img-uploader">
      {preview ? (
        <div className="img-uploader-preview">
          <img src={preview} alt="Product preview" className="img-uploader-img" />
          {!disabled && (
            <div className="img-uploader-overlay">
              <button type="button" className="img-uploader-change" onClick={() => inputRef.current?.click()}>Change</button>
              <button type="button" className="img-uploader-remove" onClick={handleRemove}>Remove</button>
            </div>
          )}
          {uploading && <div className="img-uploader-progress">Uploading…</div>}
        </div>
      ) : (
        <div
          className={`img-uploader-drop${dragOver ? ' drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          {uploading ? (
            <p className="img-uploader-hint">Uploading & converting to WebP…</p>
          ) : (
            <>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#B8960C" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <p className="img-uploader-hint"><strong>Click to upload</strong> or drag & drop<br /><span>JPG, PNG, WebP — max 5MB</span></p>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
        style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} disabled={disabled || uploading} />
    </div>
  );
};

/* ── Multi image uploader (gallery mode) ── */
const MultiUploader = ({ currentImages = [], onUpload, disabled, maxImages = 5 }) => {
  const [previews, setPreviews]   = useState(currentImages);

  React.useEffect(() => { setPreviews(currentImages); }, [JSON.stringify(currentImages)]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver]   = useState(false);
  const inputRef = useRef();

  const handleFiles = async (files) => {
    const arr = Array.from(files).slice(0, maxImages - previews.length);
    if (!arr.length) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    for (const f of arr) {
      if (!allowed.includes(f.type)) { alert('Only JPG, PNG, and WebP images are allowed.'); return; }
      if (f.size > 5 * 1024 * 1024) { alert('Each image must be under 5MB.'); return; }
    }
    setUploading(true);
    try {
      const fd = new FormData();
      arr.forEach(f => fd.append('images', f));
      const res = await api.post('/upload/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const newUrls = [...previews, ...res.data.imageUrls];
      setPreviews(newUrls);
      onUpload(newUrls);
    } catch (err) {
      alert(err.response?.data?.message || 'Upload failed.');
    } finally { setUploading(false); }
  };

  const handleRemove = (idx) => {
    const updated = previews.filter((_, i) => i !== idx);
    setPreviews(updated);
    onUpload(updated);
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); };

  return (
    <div className="img-uploader">
      {previews.length > 0 && (
        <div className="img-multi-grid">
          {previews.map((src, i) => (
            <div key={i} className="img-multi-item">
              <img src={src} alt={`Image ${i + 1}`} className="img-multi-thumb" />
              {i === 0 && <span className="img-multi-primary">Primary</span>}
              {!disabled && (
                <button type="button" className="img-multi-remove" onClick={() => handleRemove(i)}>×</button>
              )}
            </div>
          ))}
        </div>
      )}
      {previews.length < maxImages && !disabled && (
        <div
          className={`img-uploader-drop${dragOver ? ' drag-over' : ''}`}
          style={{ marginTop: previews.length ? 10 : 0 }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <p className="img-uploader-hint">Uploading…</p>
          ) : (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#B8960C" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <p className="img-uploader-hint">
                <strong>Add images</strong> ({previews.length}/{maxImages})<br />
                <span>JPG, PNG, WebP — max 5MB each</span>
              </p>
            </>
          )}
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} disabled={disabled || uploading} />
    </div>
  );
};

/* ── Exported component — mode prop selects single vs multi ── */
const ImageUploader = ({ currentImage, currentImages, onUpload, disabled, multi = false, maxImages = 5 }) => {
  if (multi) return <MultiUploader currentImages={currentImages} onUpload={onUpload} disabled={disabled} maxImages={maxImages} />;
  return <SingleUploader currentImage={currentImage} onUpload={onUpload} disabled={disabled} />;
};

export default ImageUploader;
