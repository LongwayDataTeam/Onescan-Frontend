import React from 'react';
import B2BPOPunching from './B2BPOPunching';

const B2BPendingPO = () => {
  // Force the pending tab by setting a default location
  // This component will be used when routing to /b2b-pending-po
  return <B2BPOPunching />;
};

export default B2BPendingPO;

