import { ImageResponse } from 'next/og';
import { CloutCoMark } from '@/components/cloutco-mark';

export const size = {
  width: 180,
  height: 180,
};

export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        alignItems: 'center',
        background: '#FFFFFF',
        display: 'flex',
        height: '100%',
        justifyContent: 'center',
        width: '100%',
      }}
    >
      <CloutCoMark style={{ height: 148, width: 148 }} title="CloutCo" />
    </div>,
    size,
  );
}
