import React from 'react';
import B2BPOPunching from './B2BPOPunching';

const B2BDeliveredPO = () => {
  // Force the delivered tab by setting a default location
  // This component will be used when routing to /b2b-delivered-po
  return <B2BPOPunching />;
};

export default B2BDeliveredPO;

