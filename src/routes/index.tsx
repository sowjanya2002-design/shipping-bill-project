import { createFileRoute } from "@tanstack/react-router";
import { ShippingBillForm } from '@/features/shipping-bill/shipping-bill-form';
export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: 'New Shipping Bill | Export documentation' },
    { name: 'description', content: 'Create a shipping bill with exporter, consignee, shipment, invoice, goods and supporting document details.' },
    { property: 'og:title', content: 'New Shipping Bill | Export documentation' },
    { property: 'og:description', content: 'Prepare and validate your shipping bill, invoices and export documents.' },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ] }),
  component: ShippingBillForm,
});
