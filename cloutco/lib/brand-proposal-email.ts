import { resolveBrandProposalContent } from '@/lib/brand-proposal-content';
import { formatCurrency, type BrandProposal } from '@/lib/brand-proposal-types';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character);
}

export function proposalEmail(proposal: BrandProposal, proposalUrl: string) {
  const brandName = proposal.brandName || 'your brand';
  const content = resolveBrandProposalContent(brandName, proposal.proposalToken, proposal.proposalContent);
  const price = Number(proposal.startingInvestment) > 0 ? `Starting from ${formatCurrency(proposal.startingInvestment)}` : 'Starting price to be confirmed';
  const feeScope = content.managementIncludedInStartingPrice === true
    ? `Includes the creator fee and CloutCo management for ${content.baseDeliverable}.`
    : content.managementIncludedInStartingPrice === false
      ? `Covers the creator fee for ${content.baseDeliverable}; CloutCo management is quoted separately.`
      : `The itemised quote will confirm whether CloutCo management is included for ${content.baseDeliverable}.`;
  const note = `${feeScope} This is one individual creator option, not the cost of the full 90-day programme. Final fees, usage rights and expenses will be itemised before booking.`;
  const hasStreetMarketing = proposal.additionalServices.some((service) => service.serviceType === 'street_marketing');
  const activationLine = hasStreetMarketing ? ' It also outlines the proposed PAN-India Street Marketing layer, connecting creator stories, physical discovery and an agreed response route.' : '';
  const intro = `CloutCo has prepared a creator collaboration and end-to-end management proposal for ${brandName}. ${content.viewHeadline} The proposal includes a brand story, Instagram direction, candidate creators, a step-by-step execution plan and measurement approach.${activationLine}`;
  return {
    text: `${brandName} creator collaboration proposal\n\n${intro}\n\nView the complete proposal: ${proposalUrl}\n\nCreator collaboration price: ${price}. ${note}\n\nPlease review the priority markets, focus products and budget with us before we finalise the roster and estimate.\n\nCloutCo: connect@cloutco.in | +91 84840 82402`,
    html: `<!doctype html><html><body style="margin:0;background:#f8f2e9;color:#171318;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="padding:32px 16px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;margin:0 auto;background:#fffdf9;border:1px solid #e6ddd2"><tr><td style="padding:34px"><div style="font-size:28px;font-weight:800">Clout<span style="color:#6330dc">Co</span></div><p style="color:#6330dc;font-size:11px;font-weight:700;letter-spacing:1.5px">CREATOR COLLABORATION PROPOSAL</p><h1 style="font-size:31px;line-height:1.15">Hello ${escapeHtml(brandName)} team,</h1><p style="color:#615b66;font-size:16px;line-height:1.6">${escapeHtml(intro)}</p><div style="margin:24px 0;padding:20px;background:#f3ecff"><p style="margin:0;color:#6330dc;font-size:11px;font-weight:700;letter-spacing:1.5px">CREATOR COLLABORATION PRICE</p><p style="margin:8px 0 0;font-size:22px;font-weight:700">${escapeHtml(price)}</p><p style="margin:10px 0 0;color:#625c69;font-size:13px;line-height:1.6">${escapeHtml(note)}</p></div><p style="color:#615b66;font-size:14px;line-height:1.6">Please review the priority markets, focus products and budget with us before we finalise the roster and estimate.</p><p style="margin:28px 0"><a href="${escapeHtml(proposalUrl)}" style="display:inline-block;background:#6330dc;color:white;text-decoration:none;padding:13px 20px;border-radius:7px;font-size:14px;font-weight:700">View complete proposal</a></p><p style="border-top:1px solid #e8dfd6;padding-top:18px;color:#69636c;font-size:13px;line-height:1.6">CloutCo<br>connect@cloutco.in · +91 84840 82402</p></td></tr></table></td></tr></table></body></html>`,
  };
}
