import { useFieldArray, useFormContext } from 'react-hook-form';
import { Plus, Trash2, Container, Files, Package, FileBadge, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { emptyDocument, type ShippingBillFormValues } from './model';
import { Advanced, Fields } from './fields';

type ArrayName = 'containers' | 'packingRanges' | 'documents' | 'licenses';
const definitions: { name: ArrayName; title: string; singular: string; icon: LucideIcon; core: string[]; extra: string[] }[] = [
  { name: 'containers', title: 'Containers', singular: 'container', icon: Container, core: ['containerNumber', 'containerSize', 'exciseSealNumber', 'sealDate', 'sealType'], extra: ['sealDeviceId', 'movementDocumentType', 'movementDocumentNumber', 'invoiceSerialNumber', 'itemSerialNumber', 'documentTypeCode', 'imageReferenceNumber'] },
  { name: 'packingRanges', title: 'Packing ranges', singular: 'packing range', icon: Package, core: ['packingNumberFrom', 'packingNumberTo', 'packingCode'], extra: [] },
  { name: 'documents', title: 'Supporting documents', singular: 'document', icon: Files, core: ['documentTypeCode', 'documentReferenceNumber', 'imageReferenceNumber', 'documentIssueDate'], extra: ['documentExpiryDate', 'invoiceSerialNumber', 'itemSerialNumber', 'fileType', 'icegateId', 'placeOfIssue', 'issuingPartyCode', 'issuingPartyName', 'issuingPartyAddress1', 'issuingPartyAddress2', 'issuingPartyCity', 'issuingPartyPin', 'beneficiaryPartyCode', 'beneficiaryPartyName', 'beneficiaryPartyAddress1', 'beneficiaryPartyAddress2', 'beneficiaryPartyCity', 'beneficiaryPartyPin'] },
  { name: 'licenses', title: 'Licenses', singular: 'license', icon: FileBadge, core: ['registrationNumber', 'registrationDate', 'invoiceSerialNumber', 'itemSerialNumber'], extra: ['licenseSerialNumber', 'itemSerialNumberPartE', 'itemSerialNumberPartC', 'licenseQuantity', 'licenseExportQuantity', 'indigenousOrImported'] },
];
export function OthersSection() { return <div className="form-enter">{definitions.map(d => <Records key={d.name} definition={d} />)}</div>; }
function Records({ definition: d }: { definition: typeof definitions[number] }) {
  const { control } = useFormContext<ShippingBillFormValues>();
  const array = useFieldArray({ control, name: d.name });
  const Icon = d.icon;
  function add() {
    if (d.name === 'containers') array.append({ containerNumber: '' });
    else if (d.name === 'packingRanges') array.append({ packingNumberFrom: '', packingNumberTo: '' });
    else if (d.name === 'documents') array.append(emptyDocument());
    else array.append({ registrationNumber: '' });
  }
  return <section className="border-b border-border py-7"><div className="mb-5 flex items-center justify-between gap-3"><h2 className="flex items-center gap-3 text-[15px] font-semibold"><Icon className="size-4 text-primary" />{d.title}<span className="text-xs font-normal text-muted-foreground">{array.fields.length}</span></h2><Button type="button" variant="outline" size="sm" onClick={add}><Plus />Add {d.singular}</Button></div>{!array.fields.length ? <div className="flex items-center justify-center gap-3 rounded-md border border-dashed border-border py-9 text-xs text-muted-foreground"><Icon className="size-5" />No {d.title.toLowerCase()} added</div> : array.fields.map((row, i) => <div key={row.id} className="mb-5 rounded-md border border-border bg-card p-5"><div className="mb-5 flex items-center justify-between"><h3 className="text-xs font-semibold">{d.singular.charAt(0).toUpperCase() + d.singular.slice(1)} {i + 1}</h3><Button type="button" variant="ghost" size="icon" title={`Remove ${d.singular}`} aria-label={`Remove ${d.singular} ${i + 1}`} onClick={() => array.remove(i)}><Trash2 /></Button></div><Fields prefix={`${d.name}.${i}.`} names={d.core} />{d.extra.length > 0 && <div className="mt-5"><Advanced title="Additional details"><Fields prefix={`${d.name}.${i}.`} names={d.extra} /></Advanced></div>}</div>)}</section>;
}