import { useEffect, useState } from 'react';
import { useFormContext, useWatch, type FieldPath } from 'react-hook-form';
import { Plus, Search, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { Branch, ShippingBillFormValues } from './model';
import { shippingBillService, type Party, type PartyKind } from './service';


export function PartyFields({ kind, owner, branch, label, optional = false }: { kind: PartyKind; owner: string; branch: string; label: string; optional?: boolean }) {
  const { control, setValue, register } = useFormContext<ShippingBillFormValues>();
  const id = useWatch({ control, name: owner as FieldPath<ShippingBillFormValues> }) as string;
  const branchId = useWatch({ control, name: branch as FieldPath<ShippingBillFormValues> }) as string;
  const [party, setParty] = useState<Party>();
  const [results, setResults] = useState<Party[]>([]);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [dialog, setDialog] = useState<'party' | 'branch'>();
  useEffect(() => { let active = true; shippingBillService.getParty(kind, id).then(p => { if (active) setParty(p); }).catch(() => { if (active) setError('Unable to load the selected party.'); }); return () => { active = false; }; }, [id, kind, revision]);
  useEffect(() => {
    if (!open) return;
    let active = true; setLoading(true); setError('');
    const timer = setTimeout(() => shippingBillService.searchParties(kind, query).then(p => { if (active) setResults(p); }).catch(() => { if (active) setError('Unable to load parties. Try again.'); }).finally(() => { if (active) setLoading(false); }), 180);
    return () => { active = false; clearTimeout(timer); };
  }, [kind, query, open, revision]);
  const selected = party?.branches.find(b => String(b.id) === branchId);
  function select(p: Party) { setValue(owner as FieldPath<ShippingBillFormValues>, String(p.id)); setValue(branch as FieldPath<ShippingBillFormValues>, String(p.branches[0]?.id ?? '')); setParty(p); setOpen(false); setQuery(''); }
  return <div className="min-w-0 space-y-3"><div className="flex items-center justify-between"><label className="text-xs font-medium">{label}{!optional && <span className="ml-1 text-destructive">*</span>}</label><Button type="button" variant="link" size="sm" onClick={() => setDialog('party')}><Plus />Add {label.toLowerCase()}</Button></div><div className="relative"><Button type="button" variant="outline" className="h-10 w-full justify-between font-normal" onClick={() => setOpen(!open)} aria-label={`Select ${label.toLowerCase()}`} aria-expanded={open}>{party?.name ?? `Select ${label.toLowerCase()}`}<Search className="text-muted-foreground" /></Button>{open && <div className="absolute inset-x-0 top-12 z-20 rounded-md border border-border bg-popover p-2 shadow-lg"><input className="form-control" aria-label={`Search ${label.toLowerCase()}`} placeholder="Search name or IEC…" value={query} onChange={e => setQuery(e.target.value)} autoFocus />{loading ? <p className="flex items-center gap-2 p-3 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" />Loading…</p> : error ? <div className="p-3 text-xs text-destructive">{error}<Button type="button" variant="link" onClick={() => setRevision(n => n + 1)}>Retry</Button></div> : results.length === 0 ? <p className="p-3 text-xs text-muted-foreground">No matching parties.</p> : <div className="max-h-56 overflow-auto">{results.map(p => <Button key={p.id} type="button" variant="ghost" className="h-auto w-full justify-start whitespace-normal py-3 text-left" onClick={() => select(p)}>{p.name}</Button>)}</div>}{optional && <Button type="button" variant="link" onClick={() => { setValue(owner as FieldPath<ShippingBillFormValues>, ''); setValue(branch as FieldPath<ShippingBillFormValues>, ''); setOpen(false); }}>Clear selection</Button>}</div>}</div><input type="hidden" {...register(owner as FieldPath<ShippingBillFormValues>)} /><div className="flex items-end gap-2"><div className="flex-1"><BranchField name={branch} branches={party?.branches ?? []} disabled={!id} /></div><Button type="button" variant="outline" size="icon" className="h-10 w-10" disabled={!id} aria-label={`Add ${label.toLowerCase()} branch`} title="Add branch" onClick={() => setDialog('branch')}><Plus /></Button></div>{selected && <div className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"><MapPin className="mt-0.5 size-3.5 shrink-0" /><span>{selected.address1}, {selected.city}, {selected.countryCode}{kind === 'exporter' && party?.iec && <span className="block">IEC {party.iec}{selected.gstnId && ` · GSTIN ${selected.gstnId}`}</span>}</span></div>}<PartyError name={owner} />{dialog && <PartyDialog kind={kind} mode={dialog} ownerId={id} onClose={() => setDialog(undefined)} onSaved={p => { select(p); setRevision(n => n + 1); }} />}</div>;
}

import { useContext } from 'react';
import { ErrorsContext } from './fields';
function PartyError({ name }: { name: string }) { const errors = useContext(ErrorsContext); return errors[name] ? <p className="text-xs text-destructive">{errors[name]}</p> : null; }
function BranchField({ name, branches, disabled }: { name: string; branches: Branch[]; disabled: boolean }) {
  const { register } = useFormContext<ShippingBillFormValues>();
  const errors = useContext(ErrorsContext);
  return <><label htmlFor={name} className="mb-2 block text-xs text-muted-foreground">Branch / address</label><select id={name} className="form-control" {...register(name as FieldPath<ShippingBillFormValues>)} disabled={disabled} aria-invalid={!!errors[name]}><option value="">Select branch</option>{branches.map(b => <option key={b.id} value={b.id}>{b.branchName}</option>)}</select><PartyError name={name} /></>;
}
function PartyDialog({ kind, mode, ownerId, onClose, onSaved }: { kind: PartyKind; mode: 'party' | 'branch'; ownerId: string; onClose: () => void; onSaved: (p: Party) => void }) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); e.stopPropagation(); setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>;
    try {
      if (mode === 'branch') {
        const branch = await shippingBillService.createBranch(kind, ownerId, { ...values, branchName: values['branchName'] ?? '', address1: values['address1'] ?? '', city: values['city'] ?? '', countryCode: values['countryCode'] ?? '' });
        const party = await shippingBillService.getParty(kind, ownerId);
        if (party) onSaved({ ...party, branches: [branch, ...party.branches.filter(b => b.id !== branch.id)] });
      } else onSaved(await shippingBillService.createParty(kind, values));
      onClose();
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Please try again.'); } finally { setBusy(false); }
  }
  const names = [...(mode === 'party' ? ['name', 'iec', ...(kind === 'exporter' ? ['class', 'type', 'pan', 'tan', 'aeoNumber', 'website', 'notes'] : [])] : []), 'branchName', 'address1', 'address2', 'city', 'state', 'pincode', 'countryCode', 'email', 'mobile', 'gstnId', 'adCode', 'accountNo', 'ifscCode'];
  return <Dialog open onOpenChange={o => { if (!o && !busy) onClose(); }}><DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl"><DialogTitle>Add {mode === 'branch' ? 'branch' : kind === 'thirdParty' ? 'third party' : kind}</DialogTitle><DialogDescription className="sr-only">Party and branch details</DialogDescription><form onSubmit={save} className="space-y-5"><div className="grid gap-4 sm:grid-cols-2">{names.map(name => <div key={name}><label htmlFor={`party-${name}`} className="mb-2 block text-xs font-medium">{name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase())}</label><input id={`party-${name}`} className="form-control" name={name} defaultValue={name === 'countryCode' && kind === 'exporter' ? 'IN' : undefined} required={['name', 'branchName', 'address1', 'city', 'countryCode'].includes(name)} /></div>)}</div>{mode === 'party' && kind !== 'exporter' && <div className="flex flex-wrap gap-4">{['isConsignee', 'isBuyer', 'isNotify', 'isThirdParty'].map(name => <label key={name} className="flex items-center gap-2 text-xs"><input type="checkbox" name={name} value="true" />{name.slice(2)}</label>)}</div>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="animate-spin" />}Save {mode === 'branch' ? 'branch' : 'party'}</Button></div></form></DialogContent></Dialog>;
}