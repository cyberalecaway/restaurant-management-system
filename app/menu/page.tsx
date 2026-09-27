'use client';

import Image from 'next/image';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { MenuCard } from '@/components/menu/MenuCard';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Pagination } from '@/components/ui/Table';
import { MenuItem, MenuCategory, MenuAvailability } from '@/lib/domain';
import { createClient } from '@/lib/supabase/client';
import { normalizeWhitespace, validateMenuInput } from '@/lib/input-validation.mjs';
import { normalizeMenuImagePath, resolveMenuImage } from '@/lib/menu-image';
import { createMenuImageObjectPath, getMenuImageContentType, validateMenuImageFile } from '@/lib/menu-image-upload.mjs';
import { useOnlineStatus } from '@/lib/use-online-status';

const ITEMS_PER_PAGE = 8;
const MENU_IMAGE_BUCKET = 'menu-images';

const AVAILABILITY_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'Available', label: 'Available' },
  { value: 'Sold Out', label: 'Sold Out' },
];

interface NewItemForm {
  name: string;
  category: string;
  price: string;
  description: string;
  availability: string;
  stockQuantity: string;
  image: string;
}

const EMPTY_FORM: NewItemForm = {
  name: '', category: '', price: '', description: '', availability: 'Available', stockQuantity: '0', image: '',
};

function getStoredMenuImagePath(image: string | null | undefined) {
  if (!image) return '';
  try { return normalizeMenuImagePath(image); } catch { return ''; }
}

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<MenuItem | null>(null);
  const [form, setForm] = useState<NewItemForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<NewItemForm>>({});
  const [saving, setSaving] = useState(false);
  const [savingStage, setSavingStage] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [canManagePhotos, setCanManagePhotos] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoPreviewUrlRef = useRef('');
  const savingRef = useRef(false);
  const online = useOnlineStatus();

  const clearSelectedPhoto = useCallback(() => {
    if (photoPreviewUrlRef.current) URL.revokeObjectURL(photoPreviewUrlRef.current);
    photoPreviewUrlRef.current = '';
    setPhotoPreview('');
    setSelectedPhoto(null);
  }, []);

  const openAddModal = useCallback(() => {
    setEditItem(null);
    clearSelectedPhoto();
    setSuccessMessage('');
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  }, [clearSelectedPhoto]);

  useEffect(() => {
    return () => {
      if (photoPreviewUrlRef.current) URL.revokeObjectURL(photoPreviewUrlRef.current);
    };
  }, [openAddModal]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('new') !== '1') return;
    const frame = window.requestAnimationFrame(() => {
      openAddModal();
      window.history.replaceState({}, '', window.location.pathname);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [openAddModal]);

  useEffect(() => {
    let active = true;
    async function loadMenu() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.from('menu_items').select('*').order('created_at', { ascending: false }).limit(500);
        if (error) throw error;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile, error: profileError } = await supabase.from('profiles').select('role,status').eq('id', user.id).maybeSingle();
          if (active && !profileError) setCanManagePhotos(profile?.role === 'ADMIN' && profile.status === 'ACTIVE');
        }
        if (active) setItems((data ?? []).map(row => ({ id: row.id, name: row.name, category: row.category as MenuCategory, price: Number(row.price), description: row.description, availability: row.availability as MenuAvailability, stockQuantity: Number(row.stock_quantity ?? 0), image: row.image_url ?? '' })));
      } catch (error) {
        if (active) setDataError(error instanceof Error ? error.message : 'Could not load menu items.');
      } finally {
        if (active) setLoadingData(false);
      }
    }
    void loadMenu();
    return () => { active = false; };
  }, []);

  // Filter
  const filtered = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      const matchesStatus = !statusFilter || item.availability === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, categoryFilter, statusFilter]);
  const categoryOptions = useMemo(() => Array.from(new Set(items.map(item => item.category.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [items]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginatedItems = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  function handleEdit(item: MenuItem) {
    setEditItem(item);
    clearSelectedPhoto();
    setSuccessMessage('');
    setForm({ name: item.name, category: item.category, price: String(item.price), description: item.description, availability: item.availability, stockQuantity: String(item.stockQuantity), image: item.image });
    setFormErrors({});
    setModalOpen(true);
  }

  async function handleDelete(id: string) {
    if (!online) { setDataError('You are offline. Reconnect before deleting menu items.'); return; }
    setSuccessMessage('');
    const item = items.find(current => current.id === id);
    if (item?.image && !canManagePhotos) {
      setDataError('An administrator must delete menu items with stored photos so the image can be safely removed.');
      return;
    }
    if (confirm('Delete this menu item?')) {
      try {
        const supabase = createClient();
        const { error } = await supabase.from('menu_items').delete().eq('id', id);
        if (error) throw error;
        setItems(prev => prev.filter(i => i.id !== id));
        setDataError('');
        setSuccessMessage('Menu item deleted.');
        const imagePath = getStoredMenuImagePath(item?.image);
        if (canManagePhotos && imagePath) {
          const { error: removeError } = await supabase.storage.from(MENU_IMAGE_BUCKET).remove([imagePath]);
          if (removeError) setDataError('Menu item deleted, but its photo could not be removed from Storage.');
        }
      } catch (error) {
        setDataError(error instanceof Error ? error.message : 'Could not delete this menu item.');
      }
    }
  }

  async function handleToggle(id: string) {
    if (!online) { setDataError('You are offline. Reconnect before changing menu availability.'); return; }
    const item = items.find(current => current.id === id);
    if (!item) return;
    const availability: MenuAvailability = item.availability === 'Available' ? 'Sold Out' : 'Available';
    try {
      const supabase = createClient();
      const { error } = await supabase.from('menu_items').update({ availability }).eq('id', id);
      if (error) throw error;
      setItems(prev => prev.map(current => current.id === id ? { ...current, availability } : current));
      setDataError('');
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not change menu availability.');
    }
  }

  function validateForm(): Partial<NewItemForm> {
    return validateMenuInput(form) as Partial<NewItemForm>;
  }

  async function handleSave() {
    if (savingRef.current) return;
    setSuccessMessage('');
    const errs = validateForm();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    const normalizedName = normalizeWhitespace(form.name);
    const normalizedCategory = normalizeWhitespace(form.category);
    const duplicate = items.some(item => item.id !== editItem?.id &&
      normalizeWhitespace(item.name).toLocaleLowerCase() === normalizedName.toLocaleLowerCase() &&
      normalizeWhitespace(item.category).toLocaleLowerCase() === normalizedCategory.toLocaleLowerCase());
    if (duplicate) {
      setFormErrors({ name: 'This menu item already exists in that category.' });
      return;
    }
    if (selectedPhoto && !canManagePhotos) {
      setFormErrors({ image: 'Only an active administrator can upload or replace menu photos.' });
      return;
    }
    if (!online) { setDataError('You are offline. Reconnect before saving menu changes.'); return; }
    savingRef.current = true;
    setSaving(true);
    setDataError('');
    const menuItemId = editItem?.id ?? globalThis.crypto.randomUUID();
    let uploadedPath = '';
    try {
      const supabase = createClient();
      if (selectedPhoto) {
        setSavingStage('Uploading image...');
        uploadedPath = createMenuImageObjectPath(menuItemId, selectedPhoto);
        const { error: uploadError } = await supabase.storage.from(MENU_IMAGE_BUCKET).upload(uploadedPath, selectedPhoto, {
          cacheControl: '31536000',
          contentType: getMenuImageContentType(selectedPhoto),
          upsert: false,
        });
        if (uploadError) throw uploadError;
      }
      setSavingStage('Saving menu item...');
      const values = { name: normalizedName, category: normalizedCategory, price: Number(form.price), description: form.description.trim(), availability: form.availability as MenuAvailability, stock_quantity: Number(form.stockQuantity), image_url: uploadedPath || editItem?.image || null };
      const result = editItem
        ? await supabase.from('menu_items').update(values).eq('id', editItem.id).select('*').single()
        : await supabase.from('menu_items').insert({ id: menuItemId, ...values }).select('*').single();
      if (result.error) {
        if (result.error.code === '23505') {
          setFormErrors({ name: 'This menu item already exists in that category.' });
        }
        throw result.error;
      }
      const row = result.data;
      const saved: MenuItem = { id: row.id, name: row.name, category: row.category as MenuCategory, price: Number(row.price), description: row.description, availability: row.availability as MenuAvailability, stockQuantity: Number(row.stock_quantity ?? 0), image: row.image_url ?? '' };
      setItems(prev => editItem ? prev.map(item => item.id === saved.id ? saved : item) : [saved, ...prev]);
      let cleanupWarning = false;
      const oldImagePath = getStoredMenuImagePath(editItem?.image);
      if (uploadedPath && oldImagePath && oldImagePath !== uploadedPath) {
        const { error: removeError } = await supabase.storage.from(MENU_IMAGE_BUCKET).remove([oldImagePath]);
        cleanupWarning = Boolean(removeError);
      }
      setDataError(cleanupWarning ? 'Menu item saved, but the previous photo could not be removed from Storage.' : '');
      setSuccessMessage('Menu item successfully saved.');
      clearSelectedPhoto();
      setModalOpen(false);
    } catch (error) {
      let message = error instanceof Error ? error.message : 'Could not save the menu item.';
      if (uploadedPath) {
        const { error: cleanupError } = await createClient().storage.from(MENU_IMAGE_BUCKET).remove([uploadedPath]);
        if (cleanupError) message += ' The uploaded photo could not be cleaned up from Storage.';
      }
      setSuccessMessage('');
      setDataError(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
      setSavingStage('');
    }
  }

  function handlePhotoSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    const error = validateMenuImageFile(file);
    if (error) {
      clearSelectedPhoto();
      setFormErrors(current => ({ ...current, image: error }));
      return;
    }
    if (photoPreviewUrlRef.current) URL.revokeObjectURL(photoPreviewUrlRef.current);
    photoPreviewUrlRef.current = URL.createObjectURL(file);
    setPhotoPreview(photoPreviewUrlRef.current);
    setSelectedPhoto(file);
    setFormErrors(current => ({ ...current, image: undefined }));
  }

  function closeModal() {
    setModalOpen(false);
    clearSelectedPhoto();
  }

  function setField(field: keyof NewItemForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [field]: e.target.value }));
      setFormErrors(fe => ({ ...fe, [field]: undefined }));
    };
  }

  return (
    <DashboardLayout searchPlaceholder="Search menu items...">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-lg font-bold text-[#1A2332]">Menu Management</h1>
          <p className="text-sm text-[#9BAAB8] mt-0.5">Manage active Pinoy dishes, prices, and availability</p>
        </div>
        <Button onClick={openAddModal} className="flex-shrink-0" disabled={!online}>
          <Plus size={15} /> Add Menu Item
        </Button>
      </div>

      {dataError && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{dataError}</p>}
      {successMessage && <p role="status" aria-live="polite" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">{successMessage}</p>}
      {!online && <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Offline: menu data already loaded can be viewed, but changes need an internet connection.</p>}

      {/* Filters */}
      <div className="bg-white border border-[#DDE3E8] rounded-lg p-4 mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BAAB8]" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search dishes..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-[#F4F6F8] border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] placeholder:text-[#9BAAB8] text-[#1A2332]"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-white border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] text-[#1A2332] cursor-pointer"
        >
          <option value="">All Categories</option>
          {categoryOptions.map(category => <option key={category} value={category}>{category}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm bg-white border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] text-[#1A2332] cursor-pointer"
        >
          {AVAILABILITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loadingData ? <div role="status" className="py-12 text-center text-[#66716e]">Loading menu items…</div> : paginatedItems.length === 0 ? (
        <div className="text-center py-16 text-[#9BAAB8]">No menu items found.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
          {paginatedItems.map(item => (
            <MenuCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <div className="bg-white border border-[#DDE3E8] rounded-lg">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
          totalItems={filtered.length}
          itemsPerPage={ITEMS_PER_PAGE}
          itemLabel="native dishes"
        />
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editItem ? 'Edit Menu Item' : 'Add Menu Item'}
        subtitle={editItem ? `Editing: ${editItem.name}` : 'Add a new dish to the HBA menu'}
      >
        <div className="space-y-4">
          <Input
            label="Food Name"
            placeholder="e.g. Chicken Adobo"
            value={form.name}
            onChange={setField('name')}
            error={formErrors.name}
            maxLength={120}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Category" type="text" placeholder="e.g. Chicken, Rice, Desserts" value={form.category} onChange={setField('category')} error={formErrors.category} maxLength={60} required />
            <Input
              label="Price (₱)"
              type="number"
              placeholder="e.g. 185"
              value={form.price}
              onChange={setField('price')}
              error={formErrors.price}
              min="0.01"
              max="100000"
              step="0.01"
              inputMode="decimal"
              required
            />
          </div>
          <Input
            label="Servings in stock"
            type="number"
            placeholder="e.g. 20"
            value={form.stockQuantity}
            onChange={setField('stockQuantity')}
            error={formErrors.stockQuantity}
            min="0"
            max="1000000"
            step="1"
            inputMode="numeric"
            required
          />
          <p className="-mt-3 text-xs text-[#66716e]">Enter the actual portions available to sell. Orders reduce this count automatically.</p>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[#1A2332]">Description</label>
            <textarea
              value={form.description}
              onChange={setField('description')}
              placeholder="Brief description of the dish..."
              rows={3}
              maxLength={1000}
              aria-invalid={Boolean(formErrors.description)}
              className="w-full px-3 py-2 text-sm text-[#1A2332] bg-white border border-[#DDE3E8] rounded-md outline-none focus:border-[#D92F2F] resize-none placeholder:text-[#9BAAB8]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#1A2332]">Food Photo</label>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="relative aspect-[16/9] min-h-36 overflow-hidden rounded-lg border border-[#DDE3E8] bg-[#F4F6F8]">
                {photoPreview || (editItem ? resolveMenuImage(editItem.image) : null) ? (
                  <Image src={photoPreview || resolveMenuImage(editItem?.image) || ''} alt={selectedPhoto ? `Preview of ${selectedPhoto.name}` : `${editItem?.name ?? 'Menu item'} photo`} fill unoptimized sizes="(max-width: 640px) 100vw, 400px" className="object-contain" />
                ) : <div className="flex h-full min-h-36 items-center justify-center text-sm text-[#66716e]">No image selected</div>}
              </div>
              <div className="flex flex-col items-start gap-2">
                <input ref={photoInputRef} className="sr-only" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handlePhotoSelection} disabled={!canManagePhotos || saving} />
                {canManagePhotos ? <>
                  <Button type="button" variant="outline" onClick={() => photoInputRef.current?.click()} disabled={saving}>
                    {selectedPhoto ? 'Choose Another' : editItem?.image ? 'Choose New Photo' : 'Choose Photo'}
                  </Button>
                  {selectedPhoto && <button type="button" className="text-xs font-medium text-[#66716e] underline underline-offset-2" onClick={clearSelectedPhoto} disabled={saving}>Cancel new photo</button>}
                  <p className="max-w-48 break-all text-xs text-[#66716e]">{selectedPhoto ? `Selected: ${selectedPhoto.name}` : editItem?.image ? 'Current photo is shown.' : 'Optional. Choose a photo from this device.'}</p>
                </> : <p className="max-w-48 text-xs text-[#66716e]">Only active administrators can change menu photos.</p>}
              </div>
            </div>
            <p className="text-xs text-[#66716e]">JPG, PNG, or WEBP. Maximum size: 5 MB. The photo uploads when you save.</p>
            {formErrors.image && <p role="alert" className="text-xs text-red-700">{formErrors.image}</p>}
          </div>
          <Select
            label="Availability"
            value={form.availability}
            onChange={setField('availability') as (e: React.ChangeEvent<HTMLSelectElement>) => void}
            options={[
              { value: 'Available', label: 'Available' },
              { value: 'Sold Out', label: 'Sold Out' },
            ]}
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={closeModal} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" className="flex-1" onClick={handleSave} isLoading={saving} disabled={!online || saving}>
              {saving ? savingStage || 'Saving menu item...' : editItem ? 'Save Changes' : 'Add Menu Item'}
            </Button>
          </div>
          {saving && <p role="status" aria-live="polite" className="text-center text-xs text-[#66716e]">{savingStage}</p>}
        </div>
      </Modal>
    </DashboardLayout>
  );
}
