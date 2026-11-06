export function FormatDate(date: Date | undefined) {
  if (!date) {
    return null;
  }

  const formattedDate = date
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(date))
    : "Data não informada";
    return formattedDate;
}