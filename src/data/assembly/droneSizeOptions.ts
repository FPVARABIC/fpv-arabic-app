export interface DroneSizeOption {
  sizeInch: number;
  labelAr: string;
  imagePath?: string;
  placeholderIcon?: string;
}

export const droneSizeOptions: DroneSizeOption[] = [
  { sizeInch: 3.5, labelAr: '3.5 إنش' },
  { sizeInch: 5,   labelAr: '5 إنش' },
  { sizeInch: 7,   labelAr: '7 إنش' },
];
