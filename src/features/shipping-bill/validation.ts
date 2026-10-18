import type { BillInvoiceForm, BillItemForm, ShippingBillFormValues } from './model';

export function lineTotal(item: BillItemForm) {
  return item.lineTotal?.trim() ? Number(item.lineTotal) : Number(item.quantity || 0) * Number(item.unitPrice || 0);
}
export function invoiceTotal(invoice: BillInvoiceForm) { return invoice.items.reduce((total, item) => total + lineTotal(item), 0); }
export function formatAmount(value: number, currency: string) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(Number.isFinite(value) ? value : 0); }

/** Return full field paths so validation can focus the correct tab and nested record. */
export function validateBill(v: ShippingBillFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  const required = (key: string, value: string | undefined, message = 'This field is required.') => { if (!value?.trim()) errors[key] = message; };
  const numeric = (key: string, value: string | undefined, positive = false, integer = false) => {
    if (!value?.trim()) return;
    if (!Number.isFinite(Number(value)) || (positive ? Number(value) <= 0 : Number(value) < 0) || (integer && !Number.isInteger(Number(value)))) errors[key] = integer ? 'Enter a non-negative whole number.' : positive ? 'Enter a number above zero.' : 'Enter a non-negative number.';
  };
  const date = (key: string, value: string | undefined) => { if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)))) errors[key] = 'Enter a valid date.'; };
  for (const key of ['jobDate', 'exporterId', 'exporterBranchId', 'consigneeId', 'consigneeBranchId', 'loadingPort', 'finalDestinationPort', 'natureOfCargo', 'measurementUnit'] as const) required(key, v[key]);
  date('jobDate', v.jobDate); date('rbiWaiverDate', v.rbiWaiverDate);
  if (v.rbiWaiverNumber) required('rbiWaiverDate', v.rbiWaiverDate);
  for (const key of ['grossWeight', 'netWeight', 'exchangeRate'] as const) numeric(key, v[key]);
  for (const key of ['totalPackages', 'numberOfContainers', 'loosePackets', 'jobNumber'] as const) numeric(key, v[key], false, true);
  if (v.grossWeight && v.netWeight && Number(v.netWeight) > Number(v.grossWeight)) errors['netWeight'] = 'Net weight cannot exceed gross weight.';
  if (!v.invoices.length) errors['invoices'] = 'Add at least one invoice.';
  const seen = new Set<string>();
  v.invoices.forEach((invoice, i) => {
    const p = `invoices.${i}`;
    for (const key of ['invoiceNumber', 'invoiceDate', 'currency', 'contractType'] as const) required(`${p}.${key}`, invoice[key]);
    date(`${p}.invoiceDate`, invoice.invoiceDate);
    if (invoice.invoiceNumber && seen.has(invoice.invoiceNumber.trim().toLowerCase())) errors[`${p}.invoiceNumber`] = 'Invoice numbers must be unique.';
    seen.add(invoice.invoiceNumber.trim().toLowerCase());
    if (!invoice.buyerSameAsConsignee) { required(`${p}.buyerId`, invoice.buyerId); required(`${p}.buyerBranchId`, invoice.buyerBranchId); }
    if (invoice.thirdPartyId) required(`${p}.thirdPartyBranchId`, invoice.thirdPartyBranchId);
    for (const charge of ['freight', 'insurance', 'commission', 'discount', 'otherDeductions'] as const) {
      numeric(`${p}.${charge}Rate`, invoice[`${charge}Rate`]); numeric(`${p}.${charge}Amount`, invoice[`${charge}Amount`]);
      if (Number(invoice[`${charge}Rate`]) > 100) errors[`${p}.${charge}Rate`] = 'Rate cannot exceed 100%.';
    }
    numeric(`${p}.packingCharges`, invoice.packingCharges); numeric(`${p}.invoiceTotal`, invoice.invoiceTotal); numeric(`${p}.periodOfPayment`, invoice.periodOfPayment, false, true);
    if (!invoice.items.length) errors[`${p}.items`] = 'Add at least one item.';
    invoice.items.forEach((item, j) => {
      const q = `${p}.items.${j}`;
      for (const key of ['ritcCode', 'goodsDescription1', 'quantity', 'unitOfMeasurement', 'unitPrice'] as const) required(`${q}.${key}`, item[key]);
      if (item.ritcCode && !/^\d{8}$/.test(item.ritcCode)) errors[`${q}.ritcCode`] = 'Enter an 8-digit RITC / HS code.';
      numeric(`${q}.quantity`, item.quantity, true); numeric(`${q}.unitPrice`, item.unitPrice, true);
      for (const key of ['lineTotal', 'presentMarketValue', 'numberOfUnits', 'taxableValue', 'igstAmount', 'drawbackQuantity', 'cess', 'totalPackage', 'rodtepRate', 'rodtepCap', 'rodtepQuantity', 'rodtepAmount', 'rosctlQuantity', 'rosctlAmount', 'totalDbkAmount', 'customRateAdv', 'customRateSpec', 'dbkAdv', 'dbkRateSpec', 'centralTaxLevyDuty', 'centralTaxLevyRate', 'stateLevyDuty', 'stateLevyRate'] as const) numeric(`${q}.${key}`, item[key]);
      if (item.igstPaymentStatus === 'P') { required(`${q}.taxableValue`, item.taxableValue); required(`${q}.igstAmount`, item.igstAmount); }
      if (item.thirdPartyItem) { required(`${q}.itemThirdPartyId`, item.itemThirdPartyId); required(`${q}.itemThirdPartyBranchId`, item.itemThirdPartyBranchId); }
      if (item.ar4Number) required(`${q}.ar4Date`, item.ar4Date);
      date(`${q}.ar4Date`, item.ar4Date);
    });
  });
  v.containers.forEach((c, i) => { required(`containers.${i}.containerNumber`, c.containerNumber); date(`containers.${i}.sealDate`, c.sealDate); });
  v.packingRanges.forEach((r, i) => { const p = `packingRanges.${i}`; required(`${p}.packingNumberFrom`, r.packingNumberFrom); required(`${p}.packingNumberTo`, r.packingNumberTo); numeric(`${p}.packingNumberFrom`, r.packingNumberFrom, true, true); numeric(`${p}.packingNumberTo`, r.packingNumberTo, true, true); if (Number(r.packingNumberTo) < Number(r.packingNumberFrom)) errors[`${p}.packingNumberTo`] = 'End must be greater than or equal to start.'; });
  const references = (record: { invoiceSerialNumber?: string; itemSerialNumber?: string }, p: string) => {
    numeric(`${p}.invoiceSerialNumber`, record.invoiceSerialNumber, true, true); numeric(`${p}.itemSerialNumber`, record.itemSerialNumber, true, true);
    if (record.invoiceSerialNumber && !v.invoices[Number(record.invoiceSerialNumber) - 1]) errors[`${p}.invoiceSerialNumber`] = 'Choose an existing invoice serial number.';
    if (record.itemSerialNumber && !v.invoices[Number(record.invoiceSerialNumber) - 1]?.items[Number(record.itemSerialNumber) - 1]) errors[`${p}.itemSerialNumber`] = 'Choose an item from the referenced invoice.';
  };
  v.documents.forEach((d, i) => { const p = `documents.${i}`; required(`${p}.documentTypeCode`, d.documentTypeCode); required(`${p}.documentReferenceNumber`, d.documentReferenceNumber); date(`${p}.documentIssueDate`, d.documentIssueDate); date(`${p}.documentExpiryDate`, d.documentExpiryDate); if (d.documentExpiryDate && d.documentIssueDate && d.documentExpiryDate < d.documentIssueDate) errors[`${p}.documentExpiryDate`] = 'Expiry cannot precede issue date.'; references(d, p); });
  v.licenses.forEach((l, i) => { const p = `licenses.${i}`; required(`${p}.registrationNumber`, l.registrationNumber); date(`${p}.registrationDate`, l.registrationDate); references(l, p); numeric(`${p}.licenseQuantity`, l.licenseQuantity); numeric(`${p}.licenseExportQuantity`, l.licenseExportQuantity); if (l.licenseQuantity && Number(l.licenseExportQuantity) > Number(l.licenseQuantity)) errors[`${p}.licenseExportQuantity`] = 'Export quantity cannot exceed license quantity.'; });
  return errors;
}