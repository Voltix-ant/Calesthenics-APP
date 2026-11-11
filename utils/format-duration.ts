// 83 -> "1:23"
export const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// 83456 (ms) -> "1:23.45"
export const formatDurationWithHundredths = (totalMs: number) => {
  const hundredths = Math.floor(totalMs / 10) % 100;
  return `${formatDuration(Math.floor(totalMs / 1000))}.${hundredths
    .toString()
    .padStart(2, "0")}`;
};
