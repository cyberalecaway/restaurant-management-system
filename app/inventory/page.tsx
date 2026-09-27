'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Boxes, ClipboardCheck, History, LoaderCircle, PackagePlus, Plus, Search, Save, Trash2, Truck, X } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { createClient } from '@/lib/supabase/client';
import { getInventoryStatus } from '@/lib/inventory-health.mjs';
import { useOnlineStatus } from '@/lib/use-online-status';

interface InventoryRow {
  id: string;
  name: string;
  unit: string;
  quantity_on_hand: number | string;
  minimum_level: number | string;
  reorder_level: number | string;
  updated_at: string;
}
interface MenuChoice { id: string; name: string; category: string }
interface SupplierRow { id: string; name: string; contact_name: string | null; phone: string | null; email: string | null; is_active: boolean }
interface RecipeLink { menu_item_id: string; inventory_item_id: string; quantity_per_serving: number | string; unit: string }
interface ProfileLite { id: string; full_name: string | null; email: string }
interface MovementRow {
  id: string;
  inventory_item_id: string;
  movement_type: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT' | 'WASTE' | 'RETURN';
  quantity: number | string;
  previous_quantity: number | string;
  new_quantity: number | string;
  unit: string;
  reason: string;
  supplier_id: string | null;
  order_id: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}
interface HistoryEntry extends MovementRow { ingredientName: string; supplierName: string; performer: string }

type StockForm = { name: string; unit: string; minimum: string; reorder: string };
type ActionForm = { quantity: string; physicalCount: string; reason: string; reasonDetails: string; supplierId: string; notes: string };
type RecipeForm = { menuItemId: string; inventoryItemId: string; quantity: string };
type DialogKind = 'add' | 'adjust' | 'waste' | 'history' | null;
type StockFilter = 'ALL' | 'ok' | 'low' | 'critical' | 'out';

const EMPTY_STOCK_FORM: StockForm = { name: '', unit: '', minimum: '0', reorder: '0' };
const EMPTY_ACTION_FORM: ActionForm = { quantity: '', physicalCount: '', reason: 'New Delivery', reasonDetails: '', supplierId: '', notes: '' };
const EMPTY_RECIPE_FORM: RecipeForm = { menuItemId: '', inventoryItemId: '', quantity: '' };
const STOCK_STATUS_STYLE: Record<string, string> = {
  out: 'border-red-200 bg-red-50 text-red-800',
  critical: 'border-orange-200 bg-orange-50 text-orange-800',
  low: 'border-amber-200 bg-amber-50 text-amber-800',
  ok: 'border-green-200 bg-green-50 text-green-800',
  unknown: 'border-gray-200 bg-gray-50 text-gray-700',
};
const STATUS_ORDER: Record<string, number> = { out: 0, critical: 1, low: 2, ok: 3, unknown: 4 };

function validAmount(value: string) {
  return /^\d+(?:\.\d{1,3})?$/.test(value) && Number.isFinite(Number(value)) && Number(value) >= 0;
}

function formatAmount(value: number | string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? new Intl.NumberFormat('en-PH', { maximumFractionDigits: 3 }).format(amount) : '—';
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function movementLabel(type: MovementRow['movement_type']) {
  return ({ STOCK_IN: 'Stock in', STOCK_OUT: 'Stock out', ADJUSTMENT: 'Adjustment', WASTE: 'Waste', RETURN: 'Return' })[type];
}

function movementDelta(row: MovementRow) {
  const change = Number(row.new_quantity) - Number(row.previous_quantity);
  return `${change > 0 ? '+' : change < 0 ? '−' : ''}${formatAmount(Math.abs(change))} ${row.unit}`;
}

export default function InventoryPage() {
  const [rows, setRows] = useState<InventoryRow[]>([]);
  const [menuItems, setMenuItems] = useState<MenuChoice[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [recipes, setRecipes] = useState<RecipeLink[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, StockForm>>({});
  const [stockForm, setStockForm] = useState<StockForm>(EMPTY_STOCK_FORM);
  const [supplierForm, setSupplierForm] = useState({ name: '', contactName: '', phone: '', email: '' });
  const [recipeForm, setRecipeForm] = useState<RecipeForm>(EMPTY_RECIPE_FORM);
  const [recipeEditingKey, setRecipeEditingKey] = useState('');
  const [dialogKind, setDialogKind] = useState<DialogKind>(null);
  const [dialogItem, setDialogItem] = useState<InventoryRow | null>(null);
  const [actionForm, setActionForm] = useState<ActionForm>(EMPTY_ACTION_FORM);
  const [historyItemId, setHistoryItemId] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StockFilter>('ALL');
  const [sort, setSort] = useState('name');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [savingNew, setSavingNew] = useState(false);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [savingRecipe, setSavingRecipe] = useState(false);
  const [busyAction, setBusyAction] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [recipeError, setRecipeError] = useState('');
  const [supplierError, setSupplierError] = useState('');
  const [historyWarning, setHistoryWarning] = useState(false);
  const online = useOnlineStatus();
  const dialogRef = useRef<HTMLDivElement>(null);
  const busyActionRef = useRef(false);

  const loadInventory = useCallback(async (activeCheck?: () => boolean, showLoading = false) => {
    if (showLoading) setLoading(true);
    const isActive = () => !activeCheck || activeCheck();
    try {
      const supabase = createClient();
      const [inventoryResult, recipeResult, menuResult, supplierResult, movementResult, profileResult] = await Promise.all([
        supabase.from('inventory_items').select('id,name,unit,quantity_on_hand,minimum_level,reorder_level,updated_at').order('name').limit(1000),
        supabase.from('menu_item_ingredients').select('menu_item_id,inventory_item_id,quantity_per_serving,unit').limit(5000),
        supabase.from('menu_items').select('id,name,category').order('name').limit(1000),
        supabase.from('suppliers').select('id,name,contact_name,phone,email,is_active').order('name').limit(1000),
        supabase.from('stock_movements').select('id,inventory_item_id,movement_type,quantity,previous_quantity,new_quantity,unit,reason,supplier_id,order_id,notes,performed_by,created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('profiles').select('id,full_name,email').limit(1000),
      ]);
      const queryError = inventoryResult.error ?? recipeResult.error ?? menuResult.error ?? supplierResult.error ?? movementResult.error ?? profileResult.error;
      if (queryError) throw queryError;
      if (!isActive()) return;

      const inventory = (inventoryResult.data ?? []) as unknown as InventoryRow[];
      const links = (recipeResult.data ?? []) as unknown as RecipeLink[];
      const menu = (menuResult.data ?? []) as unknown as MenuChoice[];
      const supplierRows = (supplierResult.data ?? []) as unknown as SupplierRow[];
      const movementRows = (movementResult.data ?? []) as unknown as MovementRow[];
      const profiles = (profileResult.data ?? []) as unknown as ProfileLite[];
      const inventoryById = new Map(inventory.map(item => [item.id, item.name]));
      const supplierById = new Map(supplierRows.map(item => [item.id, item.name]));
      const profileById = new Map(profiles.map(profile => [profile.id, profile.full_name?.trim() || profile.email || 'Account unavailable']));
      setRows(inventory);
      setRecipes(links);
      setMenuItems(menu);
      setSuppliers(supplierRows);
      setHistory(movementRows.map(row => ({
        ...row,
        ingredientName: inventoryById.get(row.inventory_item_id) ?? 'Ingredient unavailable',
        supplierName: row.supplier_id ? supplierById.get(row.supplier_id) ?? 'Supplier removed' : '—',
        performer: row.performed_by ? profileById.get(row.performed_by) ?? 'Account unavailable' : row.reason === 'Opening balance at ledger setup' || row.reason === 'Initial test stock (prototype)' ? 'SQL setup (no signed-in user)' : 'Account unavailable',
      })));
      setHistoryWarning(movementRows.length === 500);
      setDrafts(Object.fromEntries(inventory.map(row => [row.id, {
        name: row.name,
        unit: row.unit,
        minimum: String(row.minimum_level),
        reorder: String(row.reorder_level),
      }])));
      setError('');
    } catch (queryError) {
      if (isActive()) setError(queryError instanceof Error ? queryError.message : 'Could not load inventory. Apply supabase/inventory-stock-system.sql after the existing migrations.');
    } finally {
      if (isActive()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    const initialLoad = window.setTimeout(() => { void loadInventory(() => active); }, 0);
    const channel = supabase.channel('rms-inventory-ledger')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory_items' }, () => { void loadInventory(() => active); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, () => { void loadInventory(() => active); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => { void loadInventory(() => active); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_item_ingredients' }, () => { void loadInventory(() => active); })
      .subscribe();
    return () => { active = false; window.clearTimeout(initialLoad); void supabase.removeChannel(channel); };
  }, [loadInventory]);

  useEffect(() => {
    if (!dialogKind) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const timer = window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])')?.focus(), 0);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busyActionRef.current) { setDialogKind(null); setActionError(''); return; }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [dialogKind]);

  const summaries = useMemo(() => rows.reduce((counts, row) => {
    const status = getInventoryStatus({ quantityOnHand: row.quantity_on_hand, minimumLevel: row.minimum_level, reorderLevel: row.reorder_level });
    if (status.key === 'low') counts.low += 1;
    else if (status.key === 'critical') counts.critical += 1;
    else if (status.key === 'out') counts.out += 1;
    return counts;
  }, { low: 0, critical: 0, out: 0 }), [rows]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    const result = rows.filter(row => {
      const status = getInventoryStatus({ quantityOnHand: row.quantity_on_hand, minimumLevel: row.minimum_level, reorderLevel: row.reorder_level });
      return (!term || `${row.name} ${row.unit}`.toLocaleLowerCase().includes(term)) && (filter === 'ALL' || status.key === filter);
    });
    return result.sort((a, b) => {
      if (sort === 'quantity_asc') return Number(a.quantity_on_hand) - Number(b.quantity_on_hand) || a.name.localeCompare(b.name);
      if (sort === 'quantity_desc') return Number(b.quantity_on_hand) - Number(a.quantity_on_hand) || a.name.localeCompare(b.name);
      if (sort === 'status') {
        const aStatus = getInventoryStatus({ quantityOnHand: a.quantity_on_hand, minimumLevel: a.minimum_level, reorderLevel: a.reorder_level });
        const bStatus = getInventoryStatus({ quantityOnHand: b.quantity_on_hand, minimumLevel: b.minimum_level, reorderLevel: b.reorder_level });
        return STATUS_ORDER[aStatus.key] - STATUS_ORDER[bStatus.key] || a.name.localeCompare(b.name);
      }
      if (sort === 'updated') return new Date(b.updated_at).valueOf() - new Date(a.updated_at).valueOf();
      return a.name.localeCompare(b.name);
    });
  }, [rows, search, filter, sort]);

  const recipeKey = (menuItemId: string, inventoryItemId: string) => `${menuItemId}:${inventoryItemId}`;
  const usedInventoryIds = new Set(recipes.map(recipe => recipe.inventory_item_id));
  const menuItemsWithoutRecipe = menuItems.filter(menu => !recipes.some(recipe => recipe.menu_item_id === menu.id));
  const selectedRecipeIngredient = rows.find(row => row.id === recipeForm.inventoryItemId);
  const visibleHistory = historyItemId ? history.filter(entry => entry.inventory_item_id === historyItemId) : history;
  const dialogDescriptionId = 'inventory-dialog-description';

  function updateDraft(id: string, field: keyof StockForm, value: string) {
    setDrafts(current => ({ ...current, [id]: { ...current[id], [field]: value } }));
  }

  async function saveSettings(id: string) {
    if (!online || savingId) return;
    const draft = drafts[id];
    if (!draft || !draft.name.trim() || !draft.unit.trim() || draft.unit.trim().length > 24 || !validAmount(draft.minimum) || !validAmount(draft.reorder) || Number(draft.reorder) < Number(draft.minimum)) {
      setError('Enter a name and unit, valid non-negative thresholds, and set Reorder at to at least the Minimum.');
      return;
    }
    setSavingId(id);
    setError('');
    try {
      const { data, error: updateError } = await createClient().from('inventory_items').update({
        name: draft.name.trim(), unit: draft.unit.trim(), minimum_level: Number(draft.minimum), reorder_level: Number(draft.reorder),
      }).eq('id', id).select('id,name,unit,quantity_on_hand,minimum_level,reorder_level,updated_at').single();
      if (updateError) throw updateError;
      const updated = data as InventoryRow;
      setRows(current => current.map(row => row.id === id ? updated : row).sort((a, b) => a.name.localeCompare(b.name)));
      setDrafts(current => ({ ...current, [id]: { name: updated.name, unit: updated.unit, minimum: String(updated.minimum_level), reorder: String(updated.reorder_level) } }));
      setNotice(`${updated.name} settings saved.`);
      window.setTimeout(() => setNotice(''), 4000);
    } catch (updateError) {
      setError(updateError instanceof Error && 'code' in updateError && updateError.code === '23505' ? 'An ingredient with that name already exists.' : updateError instanceof Error ? updateError.message : 'Could not save the inventory settings.');
    } finally { setSavingId(''); }
  }

  async function addIngredient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online || savingNew) return;
    if (!stockForm.name.trim() || stockForm.name.trim().length > 120 || !stockForm.unit.trim() || stockForm.unit.trim().length > 24 || !validAmount(stockForm.minimum) || !validAmount(stockForm.reorder) || Number(stockForm.reorder) < Number(stockForm.minimum)) {
      setError('Enter an ingredient name and unit, valid non-negative thresholds, and set Reorder at to at least the Minimum.');
      return;
    }
    setSavingNew(true);
    setError('');
    try {
      // New ingredients start at zero; the physical count is entered through Add Stock so it is audited.
      const { error: insertError } = await createClient().from('inventory_items').insert({
        name: stockForm.name.trim(), unit: stockForm.unit.trim(), minimum_level: Number(stockForm.minimum), reorder_level: Number(stockForm.reorder),
      });
      if (insertError) throw insertError;
      setStockForm(EMPTY_STOCK_FORM);
      await loadInventory();
      setNotice('Ingredient added at zero stock. Use Add Stock to record its physical count.');
      window.setTimeout(() => setNotice(''), 5000);
    } catch (insertError) {
      setError(insertError instanceof Error && 'code' in insertError && insertError.code === '23505' ? 'An ingredient with this name already exists.' : insertError instanceof Error ? insertError.message : 'Could not add the ingredient.');
    } finally { setSavingNew(false); }
  }

  async function addSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online || savingSupplier) return;
    const name = supplierForm.name.trim();
    if (!name || name.length > 120 || supplierForm.contactName.trim().length > 120 || supplierForm.phone.trim().length > 40 || supplierForm.email.trim().length > 254) {
      setSupplierError('Enter a supplier name (up to 120 characters) and keep contact details within their limits.');
      return;
    }
    setSavingSupplier(true);
    setSupplierError('');
    try {
      const { data, error: insertError } = await createClient().from('suppliers').insert({
        name, contact_name: supplierForm.contactName.trim() || null, phone: supplierForm.phone.trim() || null, email: supplierForm.email.trim() || null,
      }).select('id,name,contact_name,phone,email,is_active').single();
      if (insertError) throw insertError;
      const saved = data as SupplierRow;
      setSuppliers(current => [...current, saved].sort((a, b) => a.name.localeCompare(b.name)));
      setSupplierForm({ name: '', contactName: '', phone: '', email: '' });
      setNotice(`${saved.name} was added to suppliers.`);
      window.setTimeout(() => setNotice(''), 4000);
    } catch (insertError) {
      setSupplierError(insertError instanceof Error && 'code' in insertError && insertError.code === '23505' ? 'A supplier with that name already exists.' : insertError instanceof Error ? insertError.message : 'Could not add the supplier.');
    } finally { setSavingSupplier(false); }
  }

  async function saveRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online || savingRecipe) return;
    if (!recipeForm.menuItemId || !recipeForm.inventoryItemId || !validAmount(recipeForm.quantity) || Number(recipeForm.quantity) <= 0) {
      setRecipeError('Choose a menu item and ingredient, then enter a quantity greater than zero with up to three decimal places.');
      return;
    }
    const ingredient = rows.find(row => row.id === recipeForm.inventoryItemId);
    if (!ingredient) { setRecipeError('That inventory ingredient is no longer available. Refresh and try again.'); return; }
    setSavingRecipe(true);
    setRecipeError('');
    try {
      const values = { menu_item_id: recipeForm.menuItemId, inventory_item_id: recipeForm.inventoryItemId, quantity_per_serving: Number(recipeForm.quantity), unit: ingredient.unit };
      const { error: upsertError } = await createClient().from('menu_item_ingredients').upsert(values, { onConflict: 'menu_item_id,inventory_item_id' });
      if (upsertError) throw upsertError;
      await loadInventory();
      setRecipeEditingKey('');
      setRecipeForm(EMPTY_RECIPE_FORM);
      setNotice('Recipe ingredient saved. This amount is used for future orders when they enter preparation.');
      window.setTimeout(() => setNotice(''), 5000);
    } catch (upsertError) {
      setRecipeError(upsertError instanceof Error ? upsertError.message : 'Could not save the recipe ingredient.');
    } finally { setSavingRecipe(false); }
  }

  async function removeRecipe(recipe: RecipeLink) {
    const dish = menuItems.find(menu => menu.id === recipe.menu_item_id)?.name ?? 'this menu item';
    const ingredient = rows.find(row => row.id === recipe.inventory_item_id)?.name ?? 'this ingredient';
    if (!online || !window.confirm(`Remove ${ingredient} from the ${dish} recipe? Orders cannot enter preparation until the dish has a complete recipe.`)) return;
    setRecipeError('');
    try {
      const { error: deleteError } = await createClient().from('menu_item_ingredients').delete().eq('menu_item_id', recipe.menu_item_id).eq('inventory_item_id', recipe.inventory_item_id);
      if (deleteError) throw deleteError;
      setRecipes(current => current.filter(row => recipeKey(row.menu_item_id, row.inventory_item_id) !== recipeKey(recipe.menu_item_id, recipe.inventory_item_id)));
      setNotice('Recipe ingredient removed.');
      window.setTimeout(() => setNotice(''), 4000);
    } catch (deleteError) { setRecipeError(deleteError instanceof Error ? deleteError.message : 'Could not remove the recipe ingredient.'); }
  }

  function openAction(kind: Exclude<DialogKind, null>, item: InventoryRow) {
    setDialogItem(item);
    setDialogKind(kind);
    setActionForm({ ...EMPTY_ACTION_FORM, physicalCount: String(item.quantity_on_hand) });
    setActionError('');
    setHistoryItemId(kind === 'history' ? item.id : '');
  }

  async function saveStockAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dialogItem || !dialogKind || dialogKind === 'history' || busyAction) return;
    if (dialogKind === 'adjust' ? !validAmount(actionForm.physicalCount) : !validAmount(actionForm.quantity) || Number(actionForm.quantity) <= 0) {
      setActionError(dialogKind === 'adjust' ? 'Enter a valid physical count of zero or more.' : 'Enter a quantity greater than zero with up to three decimal places.');
      return;
    }
    if (actionForm.reason === 'Other' && !actionForm.reasonDetails.trim()) {
      setActionError('Add a short reason in the details field.');
      return;
    }
    if (actionForm.notes.length > 2000 || actionForm.reasonDetails.trim().length > 120) {
      setActionError('Reason details are limited to 120 characters and notes to 2,000 characters.');
      return;
    }
    busyActionRef.current = true;
    setBusyAction(true);
    setActionError('');
    try {
      const supabase = createClient();
      const reason = actionForm.reason === 'Other' ? actionForm.reasonDetails.trim() : actionForm.reason;
      let rpcResult;
      if (dialogKind === 'add') {
        rpcResult = await supabase.rpc('add_inventory_stock', {
          p_inventory_item_id: dialogItem.id,
          p_quantity: Number(actionForm.quantity),
          p_reason: reason,
          p_supplier_id: actionForm.supplierId || null,
          p_notes: actionForm.notes.trim() || null,
          p_movement_type: actionForm.reason === 'Customer Return' ? 'RETURN' : 'STOCK_IN',
        });
      } else if (dialogKind === 'adjust') {
        rpcResult = await supabase.rpc('adjust_inventory_stock', {
          p_inventory_item_id: dialogItem.id,
          p_new_quantity: Number(actionForm.physicalCount),
          p_reason: 'Physical Count',
          p_notes: actionForm.notes.trim() || null,
        });
      } else {
        rpcResult = await supabase.rpc('record_inventory_waste', {
          p_inventory_item_id: dialogItem.id,
          p_quantity: Number(actionForm.quantity),
          p_reason: reason,
          p_notes: actionForm.notes.trim() || null,
        });
      }
      if (rpcResult.error) throw rpcResult.error;
      const message = dialogKind === 'add' ? `${dialogItem.name} stock was added and recorded.` : dialogKind === 'adjust' ? `${dialogItem.name} count was adjusted and recorded.` : `${dialogItem.name} waste was recorded.`;
      setDialogKind(null);
      await loadInventory();
      setNotice(message);
      window.setTimeout(() => setNotice(''), 5000);
    } catch (actionFailure) {
      setActionError(actionFailure instanceof Error ? actionFailure.message : 'The stock transaction could not be saved. Check your connection and try again.');
    } finally { busyActionRef.current = false; setBusyAction(false); }
  }

  const dismissDialog = () => { if (!busyActionRef.current) { setDialogKind(null); setActionError(''); } };
  const summaryCards = [
    { label: 'Total Ingredients', value: rows.length, style: 'border-[#e6e2d9] bg-[#fffefa] text-[#202b2f]' },
    { label: 'Low Stock', value: summaries.low, style: 'border-amber-200 bg-amber-50 text-amber-900' },
    { label: 'Critical', value: summaries.critical, style: 'border-orange-200 bg-orange-50 text-orange-900' },
    { label: 'Out of Stock', value: summaries.out, style: 'border-red-200 bg-red-50 text-red-900' },
  ];

  return <DashboardLayout searchPlaceholder="Search inventory...">
    <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#a52e35]">Restaurant stockroom</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-[#202b2f]">Inventory / Stock</h1><p className="mt-1 text-base text-[#66716e]">Track physical ingredients, deliveries, counts, waste, and recipe use.</p></div>
      <button type="button" onClick={() => void loadInventory(undefined, true)} disabled={!online || loading} className="min-h-11 rounded-lg border border-[#e2dfd7] bg-[#fffefa] px-4 text-sm font-semibold text-[#344348] hover:bg-[#f7f6f2] disabled:cursor-not-allowed disabled:opacity-50">{loading ? 'Refreshing…' : 'Refresh stock'}</button>
    </div>

    <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
      {summaryCards.map(card => <div key={card.label} className={`rounded-xl border px-4 py-3.5 ${card.style}`}><p className="text-sm font-medium opacity-80">{card.label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{card.value}</p></div>)}
    </div>

    <p className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-5 text-blue-950">On hand is the raw quantity physically available, in the ingredient&apos;s own unit. Recipes connect portions customers order to raw ingredients. Ingredient stock is deducted only when an order moves from Pending to Preparing—not when it is added to a bag.</p>
    {!online && <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Offline: inventory changes are disabled until your connection returns.</p>}
    {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{notice}</p>}

    <form onSubmit={addIngredient} className="mb-5 rounded-xl border border-[#e6e2d9] bg-[#fffefa] p-4 shadow-sm">
      <h2 className="mb-1 flex items-center gap-2 text-base font-semibold text-[#202b2f]"><Plus size={18} className="text-[#c6272e]" /> Add an ingredient</h2>
      <p className="mb-3 text-sm text-[#66716e]">New ingredients start at zero. Add their physical quantity with the audited Add Stock action.</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <label className="col-span-2 text-sm font-medium text-[#344348] md:col-span-2">Ingredient<input value={stockForm.name} maxLength={120} onChange={event => setStockForm(current => ({ ...current, name: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm" placeholder="e.g. Coconut Milk" /></label>
        <label className="text-sm font-medium text-[#344348]">Unit<input value={stockForm.unit} maxLength={24} onChange={event => setStockForm(current => ({ ...current, unit: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm" placeholder="kg, liters, pieces" /></label>
        <label className="text-sm font-medium text-[#344348]">Minimum<input type="number" min="0" step="0.001" value={stockForm.minimum} onChange={event => setStockForm(current => ({ ...current, minimum: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm" /></label>
        <label className="text-sm font-medium text-[#344348]">Reorder at<input type="number" min="0" step="0.001" value={stockForm.reorder} onChange={event => setStockForm(current => ({ ...current, reorder: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm" /></label>
      </div>
      <button type="submit" disabled={!online || savingNew} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#c6272e] px-4 text-sm font-semibold text-white hover:bg-[#a82026] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} />{savingNew ? 'Adding…' : 'Add ingredient'}</button>
    </form>

    <section className="mb-5 overflow-hidden rounded-xl border border-[#e6e2d9] bg-[#fffefa] shadow-sm" aria-labelledby="inventory-list-title">
      <div className="border-b border-[#e6e2d9] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3"><Boxes size={20} className="text-[#c6272e]" /><div><h2 id="inventory-list-title" className="text-lg font-semibold text-[#202b2f]">Ingredient stock</h2><p className="text-sm text-[#66716e]">Status is calculated from On Hand, Minimum, and Reorder At.</p></div></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative min-w-[190px]"><span className="sr-only">Search ingredients</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#73807b]" /><input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search ingredients" className="min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white pl-9 pr-3 text-sm focus:border-[#a52e35] focus:outline-none focus:ring-2 focus:ring-[#a52e35]/20" /></label>
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm"><span className="whitespace-nowrap font-medium text-[#66716e]">Filter</span><select value={filter} onChange={event => setFilter(event.target.value as StockFilter)} className="min-h-10 min-w-32 bg-transparent text-[#202b2f] focus:outline-none"><option value="ALL">All</option><option value="ok">In Stock</option><option value="low">Low</option><option value="critical">Critical</option><option value="out">Out of Stock</option></select></label>
            <label className="flex min-h-11 items-center gap-2 rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm"><span className="whitespace-nowrap font-medium text-[#66716e]">Sort</span><select value={sort} onChange={event => setSort(event.target.value)} className="min-h-10 min-w-32 bg-transparent text-[#202b2f] focus:outline-none"><option value="name">Ingredient name</option><option value="quantity_asc">On hand: low first</option><option value="quantity_desc">On hand: high first</option><option value="status">Status</option><option value="updated">Recently updated</option></select></label>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Quick stock status filters">
          {([['ALL','All'],['ok','In Stock'],['low','Low'],['critical','Critical'],['out','Out of Stock']] as [StockFilter,string][]).map(([key,label]) => <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)} className={`min-h-9 rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a52e35] ${filter === key ? 'bg-[#202b2f] text-white' : 'border border-[#e2dfd7] text-[#5e6966] hover:bg-[#f7f6f2]'}`}>{label}</button>)}
        </div>
      </div>
      {loading ? <p role="status" className="p-8 text-center text-sm text-[#66716e]">Loading live ingredient stock…</p> : rows.length === 0 ? <p className="p-8 text-center text-sm text-[#66716e]">No ingredients found. Run the checked-in seed or add an ingredient above.</p> : filteredRows.length === 0 ? <p className="p-8 text-center text-sm text-[#66716e]">No ingredients match this search and filter.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1140px] text-left text-sm"><thead><tr className="border-b border-[#e6e2d9] bg-[#f7f6f2]">{['Ingredient', 'Unit', 'On Hand', 'Minimum', 'Reorder At', 'Status', 'Stock Actions'].map(label => <th key={label} scope="col" className="whitespace-nowrap px-3 py-3 font-semibold text-[#5e6966]">{label}</th>)}</tr></thead>
        <tbody>{filteredRows.map(row => {
          const draft = drafts[row.id] ?? { name: row.name, unit: row.unit, minimum: String(row.minimum_level), reorder: String(row.reorder_level) };
          const status = getInventoryStatus({ quantityOnHand: row.quantity_on_hand, minimumLevel: row.minimum_level, reorderLevel: row.reorder_level });
          const hasRecipeUse = usedInventoryIds.has(row.id);
          return <tr key={row.id} className="border-b border-[#efede7] last:border-0 align-top">
            <td className="px-3 py-3"><input aria-label={`${row.name} ingredient name`} maxLength={120} value={draft.name} onChange={event => updateDraft(row.id, 'name', event.target.value)} className="min-h-10 w-44 rounded-md border border-[#e2dfd7] px-2.5" /></td>
            <td className="px-3 py-3"><input aria-label={`${row.name} unit`} maxLength={24} value={draft.unit} disabled={hasRecipeUse} title={hasRecipeUse ? 'This unit is used by a recipe. Remove or revise those recipe links before changing the unit.' : undefined} onChange={event => updateDraft(row.id, 'unit', event.target.value)} className="min-h-10 w-24 rounded-md border border-[#e2dfd7] px-2.5 disabled:bg-[#f1f0ec] disabled:text-[#727a76]" /></td>
            <td className="whitespace-nowrap px-3 py-3"><p className="min-h-10 pt-2 font-semibold tabular-nums text-[#202b2f]">{formatAmount(row.quantity_on_hand)} <span className="font-normal text-[#66716e]">{row.unit}</span></p></td>
            <td className="px-3 py-3"><input aria-label={`${row.name} minimum level`} type="number" min="0" step="0.001" value={draft.minimum} onChange={event => updateDraft(row.id, 'minimum', event.target.value)} className="min-h-10 w-24 rounded-md border border-[#e2dfd7] px-2.5" /></td>
            <td className="px-3 py-3"><input aria-label={`${row.name} reorder level`} type="number" min="0" step="0.001" value={draft.reorder} onChange={event => updateDraft(row.id, 'reorder', event.target.value)} className="min-h-10 w-24 rounded-md border border-[#e2dfd7] px-2.5" /></td>
            <td className="px-3 py-3"><span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${STOCK_STATUS_STYLE[status.key]}`}>{status.label}</span></td>
            <td className="px-3 py-3"><div className="flex min-w-[360px] flex-wrap gap-1.5">
              <button type="button" disabled={!online} onClick={() => openAction('add', row)} className="inline-flex min-h-10 items-center gap-1 rounded-md bg-[#c6272e] px-2.5 text-xs font-semibold text-white hover:bg-[#a82026] disabled:opacity-50"><PackagePlus size={14} /> Add Stock</button>
              <button type="button" disabled={!online} onClick={() => openAction('adjust', row)} className="inline-flex min-h-10 items-center gap-1 rounded-md border border-[#e2dfd7] px-2.5 text-xs font-semibold text-[#344348] hover:bg-[#f7f6f2] disabled:opacity-50"><ClipboardCheck size={14} /> Adjust</button>
              <button type="button" disabled={!online} onClick={() => openAction('waste', row)} className="inline-flex min-h-10 items-center gap-1 rounded-md border border-red-200 px-2.5 text-xs font-semibold text-red-800 hover:bg-red-50 disabled:opacity-50">Record Waste</button>
              <button type="button" onClick={() => openAction('history', row)} className="inline-flex min-h-10 items-center gap-1 rounded-md border border-[#e2dfd7] px-2.5 text-xs font-semibold text-[#344348] hover:bg-[#f7f6f2]"><History size={14} /> History</button>
              <button type="button" disabled={!online || savingId === row.id} onClick={() => void saveSettings(row.id)} className="inline-flex min-h-10 items-center gap-1 rounded-md border border-[#e2dfd7] px-2.5 text-xs font-semibold text-[#344348] hover:bg-[#f7f6f2] disabled:opacity-50"><Save size={14} />{savingId === row.id ? 'Saving…' : 'Save levels'}</button>
            </div></td>
          </tr>;
        })}</tbody></table></div>}
    </section>

    <section className="mb-5 overflow-hidden rounded-xl border border-[#e6e2d9] bg-[#fffefa] shadow-sm" aria-labelledby="recipe-links-title">
      <div className="border-b border-[#e6e2d9] px-5 py-4"><h2 id="recipe-links-title" className="text-lg font-semibold text-[#202b2f]">Recipes: ingredients per serving</h2><p className="text-sm leading-5 text-[#66716e]">A menu portion uses these raw ingredient quantities. The unit follows the inventory item, and stock is deducted when an order starts preparation.</p></div>
      {menuItemsWithoutRecipe.length > 0 && <p role="status" className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm leading-5 text-amber-950">{menuItemsWithoutRecipe.length} menu {menuItemsWithoutRecipe.length === 1 ? 'item has' : 'items have'} no recipe yet. An order containing one cannot move to Preparing until its recipe is complete. Seed values are samples; check them against the kitchen&apos;s actual recipes.</p>}
      {recipeError && <p role="alert" className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{recipeError}</p>}
      <form onSubmit={saveRecipe} className="grid grid-cols-1 gap-3 border-b border-[#e6e2d9] p-4 sm:grid-cols-2 xl:grid-cols-[1.3fr_1.3fr_1fr_auto] xl:items-end">
        <label className="text-sm font-medium text-[#344348]">Menu item<select value={recipeForm.menuItemId} onChange={event => setRecipeForm(current => ({ ...current, menuItemId: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm" required><option value="">Choose a menu item</option>{menuItems.map(item => <option key={item.id} value={item.id}>{item.name} · {item.category}</option>)}</select></label>
        <label className="text-sm font-medium text-[#344348]">Inventory ingredient<select value={recipeForm.inventoryItemId} onChange={event => setRecipeForm(current => ({ ...current, inventoryItemId: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm" required><option value="">Choose an ingredient</option>{rows.map(item => <option key={item.id} value={item.id}>{item.name} · {item.unit}</option>)}</select></label>
        <label className="text-sm font-medium text-[#344348]">Quantity per serving<input type="number" min="0.001" step="0.001" value={recipeForm.quantity} onChange={event => setRecipeForm(current => ({ ...current, quantity: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm" placeholder="e.g. 0.150" required /><span className="mt-1 block text-xs text-[#66716e]">Unit: {selectedRecipeIngredient?.unit ?? 'choose an ingredient'}</span></label>
        <button type="submit" disabled={!online || savingRecipe || loading || menuItems.length === 0 || rows.length === 0} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#202b2f] px-4 text-sm font-semibold text-white hover:bg-[#344348] disabled:cursor-not-allowed disabled:opacity-50">{savingRecipe ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}{recipeEditingKey ? 'Update recipe link' : 'Add recipe link'}</button>
      </form>
      {recipes.length === 0 ? <p className="p-6 text-center text-sm text-[#66716e]">No recipe links are recorded. Add the ingredients each menu item uses before moving its orders into preparation.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[660px] text-left text-sm"><thead><tr className="border-b border-[#e6e2d9] bg-[#f7f6f2]">{['Menu item', 'Ingredient', 'Quantity per serving', 'Actions'].map(label => <th key={label} scope="col" className="px-4 py-3 font-semibold text-[#5e6966]">{label}</th>)}</tr></thead><tbody>{[...recipes].sort((a,b) => (menuItems.find(item => item.id === a.menu_item_id)?.name ?? '').localeCompare(menuItems.find(item => item.id === b.menu_item_id)?.name ?? '')).map(recipe => {
        const dish = menuItems.find(item => item.id === recipe.menu_item_id);
        const ingredient = rows.find(item => item.id === recipe.inventory_item_id);
        return <tr key={recipeKey(recipe.menu_item_id, recipe.inventory_item_id)} className="border-b border-[#efede7] last:border-0"><td className="px-4 py-3 font-medium text-[#202b2f]">{dish?.name ?? 'Menu item unavailable'}</td><td className="px-4 py-3">{ingredient?.name ?? 'Ingredient unavailable'}</td><td className="px-4 py-3 tabular-nums">{formatAmount(recipe.quantity_per_serving)} {recipe.unit} / serving</td><td className="px-4 py-3"><div className="flex gap-2"><button type="button" onClick={() => { setRecipeEditingKey(recipeKey(recipe.menu_item_id, recipe.inventory_item_id)); setRecipeForm({ menuItemId: recipe.menu_item_id, inventoryItemId: recipe.inventory_item_id, quantity: String(recipe.quantity_per_serving) }); }} className="min-h-9 rounded-md border border-[#e2dfd7] px-3 text-xs font-semibold text-[#344348] hover:bg-[#f7f6f2]">Edit</button><button type="button" disabled={!online} onClick={() => void removeRecipe(recipe)} aria-label={`Remove ${ingredient?.name ?? 'ingredient'} from ${dish?.name ?? 'recipe'}`} className="grid h-9 w-9 place-items-center rounded-md border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"><Trash2 size={15} /></button></div></td></tr>;
      })}</tbody></table></div>}
    </section>

    <section className="mb-5 overflow-hidden rounded-xl border border-[#e6e2d9] bg-[#fffefa] shadow-sm" aria-labelledby="suppliers-title">
      <div className="flex items-center gap-3 border-b border-[#e6e2d9] px-5 py-4"><Truck size={20} className="text-[#c6272e]" /><div><h2 id="suppliers-title" className="text-lg font-semibold text-[#202b2f]">Suppliers</h2><p className="text-sm text-[#66716e]">Optional supplier details can be attached to stock-in records.</p></div></div>
      {supplierError && <p role="alert" className="mx-4 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{supplierError}</p>}
      <form onSubmit={addSupplier} className="grid grid-cols-1 gap-3 border-b border-[#e6e2d9] p-4 sm:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1.2fr_auto] xl:items-end">
        <label className="text-sm font-medium text-[#344348]">Supplier name<input value={supplierForm.name} maxLength={120} onChange={event => setSupplierForm(current => ({ ...current, name: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm" placeholder="e.g. Cebu Fresh Foods" required /></label>
        <label className="text-sm font-medium text-[#344348]">Contact person<input value={supplierForm.contactName} maxLength={120} onChange={event => setSupplierForm(current => ({ ...current, contactName: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm" /></label>
        <label className="text-sm font-medium text-[#344348]">Phone<input value={supplierForm.phone} maxLength={40} onChange={event => setSupplierForm(current => ({ ...current, phone: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm" /></label>
        <label className="text-sm font-medium text-[#344348]">Email<input type="email" value={supplierForm.email} maxLength={254} onChange={event => setSupplierForm(current => ({ ...current, email: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3 text-sm" /></label>
        <button type="submit" disabled={!online || savingSupplier} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#e2dfd7] px-4 text-sm font-semibold text-[#344348] hover:bg-[#f7f6f2] disabled:cursor-not-allowed disabled:opacity-50"><Plus size={16} />{savingSupplier ? 'Saving…' : 'Add supplier'}</button>
      </form>
      {suppliers.length === 0 ? <p className="p-5 text-sm text-[#66716e]">No suppliers added yet. Stock can still be received without selecting a supplier.</p> : <ul className="grid gap-2 p-4 sm:grid-cols-2 xl:grid-cols-3">{suppliers.filter(supplier => supplier.is_active).map(supplier => <li key={supplier.id} className="rounded-lg border border-[#efede7] px-3 py-2.5"><p className="text-sm font-semibold text-[#202b2f]">{supplier.name}</p><p className="mt-0.5 text-sm text-[#66716e]">{[supplier.contact_name, supplier.phone, supplier.email].filter(Boolean).join(' · ') || 'No contact details'}</p></li>)}</ul>}
    </section>

    <section className="overflow-hidden rounded-xl border border-[#e6e2d9] bg-[#fffefa] shadow-sm" aria-labelledby="stock-history-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e6e2d9] px-5 py-4"><div className="flex items-center gap-3"><History size={20} className="text-[#c6272e]" /><div><h2 id="stock-history-title" className="text-lg font-semibold text-[#202b2f]">Stock movement history</h2><p className="text-sm text-[#66716e]">Latest {Math.min(history.length, 500)} ledger entries, newest first.</p></div></div>{historyItemId && <button type="button" onClick={() => setHistoryItemId('')} className="min-h-10 rounded-md border border-[#e2dfd7] px-3 text-sm font-semibold text-[#344348]">Show all ingredients</button>}</div>
      {historyWarning && <p role="status" className="border-b border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-900">Showing the 500 newest entries. Use a date filter or database query for older history.</p>}
      {history.length === 0 ? <p className="p-6 text-center text-sm text-[#66716e]">No stock movements have been recorded yet. Adding stock, adjusting a count, recording waste, and starting recipe-based preparation will appear here.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead><tr className="border-b border-[#e6e2d9] bg-[#f7f6f2]">{['Date', 'Ingredient', 'Type', 'Quantity', 'Previous', 'New', 'Reason / Supplier', 'Performed by'].map(label => <th key={label} scope="col" className="whitespace-nowrap px-3 py-3 font-semibold text-[#5e6966]">{label}</th>)}</tr></thead><tbody>{visibleHistory.slice(0, 40).map(entry => <tr key={entry.id} className="border-b border-[#efede7] last:border-0"><td className="whitespace-nowrap px-3 py-3 text-[#5e6966]">{formatDate(entry.created_at)}</td><td className="px-3 py-3 font-semibold text-[#202b2f]">{entry.ingredientName}</td><td className="px-3 py-3"><span className="rounded-full border border-[#e6e2d9] bg-[#f7f6f2] px-2.5 py-1 text-xs font-semibold">{movementLabel(entry.movement_type)}</span></td><td className="whitespace-nowrap px-3 py-3 font-semibold tabular-nums">{movementDelta(entry)}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{formatAmount(entry.previous_quantity)} {entry.unit}</td><td className="whitespace-nowrap px-3 py-3 tabular-nums">{formatAmount(entry.new_quantity)} {entry.unit}</td><td className="max-w-64 px-3 py-3"><p className="font-medium">{entry.reason}</p><p className="text-xs text-[#66716e]">{entry.supplierName}</p>{entry.order_id && <p className="text-xs text-[#66716e]">Order linked</p>}</td><td className="px-3 py-3">{entry.performer}</td></tr>)}</tbody></table></div>}
      {visibleHistory.length > 40 && <p className="border-t border-[#e6e2d9] px-5 py-3 text-sm text-[#66716e]">Showing 40 of {visibleHistory.length} matching entries. Use History on an ingredient row to narrow this list.</p>}
    </section>

    {dialogKind && <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[#111714]/60 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) dismissDialog(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="inventory-dialog-title" aria-describedby={dialogDescriptionId} className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#e9e4da] bg-[#fffefa] shadow-[0_24px_80px_rgba(0,0,0,.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#e6e2d9] px-5 py-4 sm:px-6"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#a52e35]">HBA Kitchen · Stockroom</p><h2 id="inventory-dialog-title" className="mt-1 text-xl font-semibold text-[#202b2f]">{dialogKind === 'history' ? 'Ingredient history' : dialogKind === 'add' ? 'Add stock' : dialogKind === 'adjust' ? 'Adjust stock count' : 'Record waste'}</h2><p id={dialogDescriptionId} className="mt-1 text-sm text-[#66716e]">{dialogItem?.name} · current on hand {dialogItem ? `${formatAmount(dialogItem.quantity_on_hand)} ${dialogItem.unit}` : ''}</p></div><button type="button" onClick={dismissDialog} disabled={busyAction} aria-label="Close inventory dialog" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[#66716e] hover:bg-[#f3f1ec] disabled:opacity-50"><X size={19} /></button></div>
        {dialogKind === 'history' ? <>
          <div className="max-h-[65vh] overflow-y-auto px-5 py-4 sm:px-6">{visibleHistory.length === 0 ? <p className="py-8 text-center text-sm text-[#66716e]">No movements recorded for this ingredient.</p> : <ol className="space-y-3">{visibleHistory.map(entry => <li key={entry.id} className="rounded-lg border border-[#e6e2d9] p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-sm font-semibold text-[#202b2f]">{movementLabel(entry.movement_type)} · {movementDelta(entry)}</p><p className="mt-0.5 text-sm text-[#66716e]">{entry.reason}{entry.supplierName !== '—' ? ` · ${entry.supplierName}` : ''}</p></div><time className="text-xs text-[#66716e]">{formatDate(entry.created_at)}</time></div><p className="mt-2 text-xs text-[#5e6966]">{formatAmount(entry.previous_quantity)} {entry.unit} → {formatAmount(entry.new_quantity)} {entry.unit} · {entry.performer}</p>{entry.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-[#5e6966]">{entry.notes}</p>}</li>)}</ol>}</div>
          <div className="border-t border-[#e6e2d9] p-4 text-right"><button type="button" onClick={dismissDialog} className="min-h-11 rounded-lg bg-[#202b2f] px-5 text-sm font-semibold text-white hover:bg-[#344348]">Close</button></div>
        </> : <form onSubmit={saveStockAction} className="space-y-4 p-5 sm:p-6">
          {dialogKind === 'add' && <>
            <label className="block text-sm font-semibold text-[#344348]">Quantity to add<input type="number" min="0.001" step="0.001" value={actionForm.quantity} onChange={event => setActionForm(current => ({ ...current, quantity: event.target.value }))} className="mt-1 min-h-12 w-full rounded-lg border border-[#d9d5cc] bg-white px-3 text-base" placeholder={`Enter quantity in ${dialogItem?.unit ?? 'unit'}`} required /><span className="mt-1 block text-sm font-normal text-[#66716e]">Unit: {dialogItem?.unit}</span></label>
            <div className="rounded-lg bg-[#f5f3ed] px-4 py-3 text-sm text-[#344348]">Estimated new on hand: <strong className="tabular-nums">{dialogItem && validAmount(actionForm.quantity) ? `${formatAmount(Number(dialogItem.quantity_on_hand) + Number(actionForm.quantity))} ${dialogItem.unit}` : 'Enter a quantity'}</strong></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="text-sm font-semibold text-[#344348]">Reason<select value={actionForm.reason} onChange={event => setActionForm(current => ({ ...current, reason: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3"><option>New Delivery</option><option>Purchase</option><option>Opening Count</option><option>Customer Return</option><option>Other</option></select></label><label className="text-sm font-semibold text-[#344348]">Supplier <span className="font-normal text-[#66716e]">(optional)</span><select value={actionForm.supplierId} onChange={event => setActionForm(current => ({ ...current, supplierId: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3"><option value="">No supplier selected</option>{suppliers.filter(supplier => supplier.is_active).map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label></div>
          </>}
          {dialogKind === 'adjust' && <>
            <p className="text-sm leading-5 text-[#5e6966]">Enter the physical count you verified. The system records the difference from the current database count as an adjustment.</p>
            <label className="block text-sm font-semibold text-[#344348]">Physical count<input type="number" min="0" step="0.001" value={actionForm.physicalCount} onChange={event => setActionForm(current => ({ ...current, physicalCount: event.target.value }))} className="mt-1 min-h-12 w-full rounded-lg border border-[#d9d5cc] bg-white px-3 text-base" required /><span className="mt-1 block text-sm font-normal text-[#66716e]">Unit: {dialogItem?.unit}</span></label>
            <div className="rounded-lg bg-[#f5f3ed] px-4 py-3 text-sm text-[#344348]">Adjustment: <strong className="tabular-nums">{dialogItem && validAmount(actionForm.physicalCount) ? `${Number(actionForm.physicalCount) - Number(dialogItem.quantity_on_hand) > 0 ? '+' : Number(actionForm.physicalCount) - Number(dialogItem.quantity_on_hand) < 0 ? '−' : ''}${formatAmount(Math.abs(Number(actionForm.physicalCount) - Number(dialogItem.quantity_on_hand)))} ${dialogItem.unit}` : 'Enter a physical count'}</strong></div>
          </>}
          {dialogKind === 'waste' && <>
            <label className="block text-sm font-semibold text-[#344348]">Quantity wasted<input type="number" min="0.001" step="0.001" value={actionForm.quantity} onChange={event => setActionForm(current => ({ ...current, quantity: event.target.value }))} className="mt-1 min-h-12 w-full rounded-lg border border-[#d9d5cc] bg-white px-3 text-base" required /><span className="mt-1 block text-sm font-normal text-[#66716e]">Unit: {dialogItem?.unit}</span></label>
            <div className="rounded-lg bg-[#fff1ef] px-4 py-3 text-sm text-[#6f2529]">Estimated new on hand: <strong className="tabular-nums">{dialogItem && validAmount(actionForm.quantity) ? `${formatAmount(Number(dialogItem.quantity_on_hand) - Number(actionForm.quantity))} ${dialogItem.unit}` : 'Enter a quantity'}</strong></div>
            <label className="block text-sm font-semibold text-[#344348]">Waste reason<select value={actionForm.reason} onChange={event => setActionForm(current => ({ ...current, reason: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3"><option>Spoiled</option><option>Expired</option><option>Damaged</option><option>Preparation loss</option><option>Other</option></select></label>
          </>}
          {actionForm.reason === 'Other' && <label className="block text-sm font-semibold text-[#344348]">Reason details<input value={actionForm.reasonDetails} maxLength={120} onChange={event => setActionForm(current => ({ ...current, reasonDetails: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-[#e2dfd7] bg-white px-3" required /></label>}
          <label className="block text-sm font-semibold text-[#344348]">{dialogKind === 'adjust' ? 'Notes' : 'Notes'} <span className="font-normal text-[#66716e]">(optional)</span><textarea value={actionForm.notes} maxLength={2000} onChange={event => setActionForm(current => ({ ...current, notes: event.target.value }))} className="mt-1 min-h-24 w-full rounded-lg border border-[#e2dfd7] bg-white px-3 py-2.5 font-normal" placeholder="Add delivery, count, or waste details" /></label>
          {actionError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm leading-5 text-red-800">{actionError}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-[#e6e2d9] pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={dismissDialog} disabled={busyAction} className="min-h-11 rounded-lg border border-[#d8d4cb] px-5 text-sm font-semibold text-[#344348] hover:bg-[#f3f1ec] disabled:opacity-50">Cancel</button><button type="submit" disabled={!online || busyAction} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#c6272e] px-5 text-sm font-semibold text-white hover:bg-[#a82026] disabled:cursor-wait disabled:opacity-60">{busyAction && <LoaderCircle size={16} className="animate-spin" />}{busyAction ? 'Saving movement…' : dialogKind === 'add' ? 'Add Stock' : dialogKind === 'adjust' ? 'Save adjustment' : 'Record Waste'}</button></div>
        </form>}
      </section>
    </div>}
  </DashboardLayout>;
}
