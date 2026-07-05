export {};

declare global {
  interface Date {
    toIsoUtcString(): string;
    isSameDay(other: Date): boolean;
  }
}

Date.prototype.toIsoUtcString = function toIsoUtcString(): string {
  return this.toISOString();
};

Date.prototype.isSameDay = function isSameDay(other: Date): boolean {
  return (
    this.getFullYear() === other.getFullYear() &&
    this.getMonth() === other.getMonth() &&
    this.getDate() === other.getDate()
  );
};
