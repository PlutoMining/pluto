export interface Dashboard {
  name: string;
  publicUrl: string;
  grafanaData: {
    createdAt: string;
    updatedAt: string;
  };
}
