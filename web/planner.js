const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const bakery = [
  { id: "off", label: "Off" },
  { id: "avbak", label: "Avbak · 03:00–11:30" },
  { id: "bakers", label: "Bakers · 05:20–13:50" },
  { id: "bord-early", label: "Bordspasset · 06:30–15:00" },
  { id: "bord-late", label: "Bordspasset · 08:00–16:30" },
  { id: "avbak-helg", label: "Avbak (Helg) · 05:00–14:00" },
  { id: "helg", label: "Helg · 06:00–14:30" },
];
const kitchen = [
  { id: "off", label: "Off" },
  { id: "kit-am-early", label: "Kitchen AM · 06:30–14:30" },
  { id: "kit-am", label: "Kitchen AM · 07:00–15:30" },
  { id: "kit-prep", label: "Kitchen Prep · 07:00–15:30" },
  { id: "kit-am-sat", label: "Kitchen AM · 06:30–15:30" },
  { id: "kit-pm", label: "Kitchen PM · 09:00–17:30" },
];
const foh = [
  { id: "off", label: "Off" },
  { id: "foh-open", label: "FOH Open · 07:00–14:00" },
  { id: "foh-pm", label: "FOH PM · 09:00–18:30" },
  { id: "pm-runner", label: "PM Runner · 08:00–17:00" },
  { id: "pm-runner-late", label: "PM Runner · 11:00–17:00" },
  { id: "pm-close", label: "PM Runner Close · 11:00–18:30" },
  { id: "runner-am", label: "AM Runner · 07:30–15:00" },
];
const admin = [
  { id: "off", label: "Off" },
  { id: "admin", label: "ADMIN · 09:00–17:00" },
  { id: "bord-late", label: "Bordspasset · 08:00–16:30" },
];
const erik = [
  { id: "off", label: "Off" },
  { id: "open", label: "FOH Open · 06:30–14:30" },
  { id: "open-short", label: "Open short · 07:00–13:00" },
  { id: "mid", label: "FOH MID · 07:30–16:00" },
  { id: "mid-weekend", label: "FOH MID WEEKEND · 08:00–16:30" },
  { id: "close", label: "FOH CLOSE · 09:00–17:30" },
  { id: "close-late", label: "FOH CLOSE · 10:00–17:30" },
  { id: "close-short", label: "Close Short · 12:00–17:30" },
  { id: "open-weekend", label: "FOH OPEN WEEKEND · 08:00–16:00" },
];

const OSTERMALM = [
  ["Albin Andersson", "Bakery", bakery],
  ["Emma Chipman", "Bakery", bakery],
  ["Freddy Etnebreith Arraez Quartararo", "Bakery", bakery],
  ["Giovanny Miguel Quartararo Martinez", "Bakery", bakery],
  ["Hasan Tunahan Tolan", "Bakery", bakery],
  ["Jonatan Almendra", "Bakery", bakery],
  ["Meja Jansson", "Bakery", bakery],
  ["Anna Denysiuk", "Kitchen", kitchen],
  ["James Christopher Kendi", "Kitchen", kitchen],
  ["Jasmin Ahmad", "Kitchen", kitchen],
  ["Valeria Viitiuk", "Kitchen", kitchen],
  ["Viktoriia Maistriuk", "Kitchen", kitchen],
  ["Agnes Skantze", "FOH", foh],
  ["Alice Murby Hamilton", "FOH", foh],
  ["Buster Lind", "FOH", foh],
  ["Ebba Movander", "FOH", foh],
  ["Edwin Zillen", "FOH", foh],
  ["Ella Söderberg", "FOH", foh],
  ["Elsa Hall", "FOH", foh],
  ["Emelie Andersson", "FOH", foh],
  ["Felix Rosendahl Nilsson", "FOH", foh],
  ["Greta Sandström", "FOH", foh],
  ["Hanna Danström", "FOH", foh],
  ["Jacqueline Lydmar", "FOH", foh],
  ["Julia Schantz", "FOH", foh],
  ["Kalle Knutson", "FOH", foh],
  ["Katherine Breton", "FOH", foh],
  ["Liv Wikström", "FOH", foh],
  ["Louise Axland", "FOH", foh],
  ["Marianela Priori Saenz", "FOH", foh],
  ["Maya Hedman", "FOH", foh],
  ["Mika Knutson", "FOH", foh],
  ["Mio Ollinen", "FOH", foh],
  ["Molly Soneson", "FOH", foh],
  ["Sophie Bielke", "FOH", foh],
  ["Stella Rosenblatt Mörner", "FOH", foh],
  ["Svea Grundin", "FOH", foh],
  ["Teodor Warpe", "FOH", foh],
  ["Thea Mohr Malm", "FOH", foh],
  ["Trude Lindsten", "FOH", foh],
  ["Viggo Onyango", "FOH", foh],
  ["Graeme Wylie", "Admin", admin],
].map(([name, group, shifts]) => ({ name, group, shifts, tone: toneFor(group) }));

const VASASTAN = [
  "Edda Hallenberg",
  "Ella Onyango",
  "Ellen Wellerfors",
  "Elsa Hall",
  "Hanna Danström",
  "Janna Wessman",
  "Jasmin Ahmad",
  "Malin Dyrvold",
  "Märta Fröjlinger",
  "Thea Mohr Malm",
].map((name) => ({ name, group: "FOH Vasastan", shifts: erik, tone: "erik" }));

const W45 = {
  "Albin Andersson|0": "bakers",
  "Albin Andersson|1": "bakers",
  "Albin Andersson|4": "bakers",
  "Albin Andersson|5": "helg",
  "Albin Andersson|6": "helg",
  "Emma Chipman|0": "bord-late",
  "Emma Chipman|1": "avbak",
  "Emma Chipman|2": "bord-early",
  "Emma Chipman|3": "bord-early",
  "Emma Chipman|5": "avbak-helg",
  "Freddy Etnebreith Arraez Quartararo|0": "bord-early",
  "Freddy Etnebreith Arraez Quartararo|1": "bord-late",
  "Freddy Etnebreith Arraez Quartararo|2": "bord-early",
  "Freddy Etnebreith Arraez Quartararo|3": "bord-early",
  "Freddy Etnebreith Arraez Quartararo|5": "avbak-helg",
  "Giovanny Miguel Quartararo Martinez|1": "bord-early",
  "Giovanny Miguel Quartararo Martinez|2": "bord-late",
  "Giovanny Miguel Quartararo Martinez|3": "avbak",
  "Giovanny Miguel Quartararo Martinez|4": "bord-early",
  "Giovanny Miguel Quartararo Martinez|6": "avbak-helg",
  "Hasan Tunahan Tolan|2": "avbak",
  "Hasan Tunahan Tolan|3": "bord-late",
  "Hasan Tunahan Tolan|4": "avbak",
  "Hasan Tunahan Tolan|6": "avbak-helg",
  "Jonatan Almendra|0": "bord-early",
  "Jonatan Almendra|1": "bakers",
  "Jonatan Almendra|3": "bakers",
  "Jonatan Almendra|4": "bord-late",
  "Meja Jansson|0": "avbak",
  "Meja Jansson|1": "bord-early",
  "Meja Jansson|3": "bord-late",
  "Meja Jansson|4": "avbak",
  "Anna Denysiuk|2": "kit-am",
  "Anna Denysiuk|3": "kit-pm",
  "Anna Denysiuk|5": "kit-am-sat",
  "Anna Denysiuk|6": "kit-pm",
  "James Christopher Kendi|1": "kit-prep",
  "James Christopher Kendi|3": "kit-prep",
  "Jasmin Ahmad|0": "kit-prep",
  "Jasmin Ahmad|2": "kit-prep",
  "Valeria Viitiuk|0": "kit-am-early",
  "Valeria Viitiuk|1": "kit-am-early",
  "Valeria Viitiuk|2": "kit-pm",
  "Valeria Viitiuk|4": "kit-am",
  "Valeria Viitiuk|5": "kit-pm",
  "Viktoriia Maistriuk|0": "kit-pm",
  "Viktoriia Maistriuk|1": "kit-pm",
  "Viktoriia Maistriuk|3": "kit-am",
  "Viktoriia Maistriuk|4": "kit-pm",
  "Viktoriia Maistriuk|6": "kit-am",
  "Agnes Skantze|4": "pm-runner",
  "Alice Murby Hamilton|3": "runner-am",
  "Buster Lind|0": "pm-close",
  "Buster Lind|2": "pm-runner",
  "Buster Lind|5": "foh-pm",
  "Buster Lind|6": "pm-close",
  "Ella Söderberg|3": "pm-runner",
  "Elsa Hall|1": "foh-mid",
  "Elsa Hall|5": "mid-weekend",
  "Emelie Andersson|3": "pm-runner",
  "Felix Rosendahl Nilsson|4": "pm-runner",
  "Greta Sandström|0": "foh-am",
  "Greta Sandström|1": "foh-am",
  "Greta Sandström|2": "foh-am",
  "Greta Sandström|3": "foh-am",
  "Greta Sandström|6": "runner-am",
  "Hanna Danström|0": "foh-mid",
  "Hanna Danström|2": "foh-close",
  "Hanna Danström|3": "foh-close",
  "Hanna Danström|4": "foh-close",
  "Hanna Danström|5": "foh-close",
  "Jacqueline Lydmar|4": "pm-close",
  "Julia Schantz|3": "foh-pm",
  "Liv Wikström|4": "pm-close",
  "Louise Axland|3": "pm-close",
  "Marianela Priori Saenz|4": "foh-pm",
  "Maya Hedman|0": "pm-runner",
  "Maya Hedman|1": "pm-runner",
  "Maya Hedman|2": "foh-pm",
  "Maya Hedman|5": "foh-am",
  "Maya Hedman|6": "foh-am",
  "Mika Knutson|0": "pm-runner",
  "Mika Knutson|1": "foh-pm",
  "Mika Knutson|2": "pm-close",
  "Mika Knutson|5": "runner-am",
  "Mika Knutson|6": "pm-runner",
  "Molly Soneson|3": "pm-close",
  "Sophie Bielke|1": "pm-runner",
  "Sophie Bielke|2": "pm-runner",
  "Sophie Bielke|5": "pm-close",
  "Sophie Bielke|6": "pm-close",
  "Stella Rosenblatt Mörner|0": "foh-pm",
  "Stella Rosenblatt Mörner|1": "pm-close",
  "Stella Rosenblatt Mörner|2": "pm-close",
  "Stella Rosenblatt Mörner|5": "pm-runner",
  "Stella Rosenblatt Mörner|6": "pm-runner",
  "Svea Grundin|0": "runner-am",
  "Svea Grundin|1": "runner-am",
  "Svea Grundin|2": "runner-am",
  "Svea Grundin|5": "pm-close",
  "Thea Mohr Malm|0": "pm-close",
  "Thea Mohr Malm|1": "pm-close",
  "Thea Mohr Malm|4": "foh-am",
  "Trude Lindsten|4": "runner-am",
  "Graeme Wylie|0": "admin",
  "Graeme Wylie|1": "admin",
  "Graeme Wylie|2": "admin",
  "Graeme Wylie|3": "admin",
  "Graeme Wylie|4": "admin",
};

const W45_VASASTAN = {
  "Thea Mohr Malm|3": "mid",
  "Thea Mohr Malm|5": "close",
  "Thea Mohr Malm|6": "close",
};

const W46 = {
  "Emma Chipman|0": "avbak",
  "Emma Chipman|1": "avbak",
  "Emma Chipman|2": "bord-early",
  "Emma Chipman|3": "bord-early",
  "Emma Chipman|4": "bord-early",
  "Freddy Etnebreith Arraez Quartararo|0": "bord-early",
  "Freddy Etnebreith Arraez Quartararo|3": "avbak",
  "Freddy Etnebreith Arraez Quartararo|4": "bord-late",
  "Giovanny Miguel Quartararo Martinez|0": "bord-late",
  "Giovanny Miguel Quartararo Martinez|1": "bord-early",
  "Giovanny Miguel Quartararo Martinez|2": "bord-late",
  "Giovanny Miguel Quartararo Martinez|3": "bord-early",
  "Giovanny Miguel Quartararo Martinez|4": "avbak",
  "Hasan Tunahan Tolan|1": "bord-late",
  "Hasan Tunahan Tolan|2": "avbak",
  "Hasan Tunahan Tolan|5": "avbak-helg",
  "Hasan Tunahan Tolan|6": "avbak-helg",
  "Jonatan Almendra|2": "bord-early",
  "Jonatan Almendra|3": "bord-late",
  "Jonatan Almendra|4": "bord-early",
  "Jonatan Almendra|5": "avbak-helg",
  "Jonatan Almendra|6": "avbak-helg",
  "Meja Jansson|0": "bord-early",
  "Meja Jansson|1": "bord-early",
  "Meja Jansson|2": "bord-early",
  "Meja Jansson|3": "bord-early",
  "Jasmin Ahmad|0": "kit-am",
  "Jasmin Ahmad|1": "kit-am",
  "Jasmin Ahmad|5": "kit-am-sat",
  "James Christopher Kendi|1": "kit-prep",
  "James Christopher Kendi|2": "kit-prep",
  "James Christopher Kendi|3": "kit-prep",
  "James Christopher Kendi|4": "kit-prep",
  "Anna Denysiuk|0": "kit-prep",
  "Anna Denysiuk|2": "kit-am",
  "Anna Denysiuk|3": "kit-am",
  "Anna Denysiuk|4": "kit-am",
  "Valeria Viitiuk|0": "kit-pm",
  "Valeria Viitiuk|3": "kit-pm",
  "Valeria Viitiuk|4": "kit-pm",
  "Valeria Viitiuk|6": "kit-pm",
  "Viktoriia Maistriuk|1": "kit-pm",
  "Viktoriia Maistriuk|2": "kit-pm",
  "Viktoriia Maistriuk|5": "kit-pm",
  "Viktoriia Maistriuk|6": "kit-am",
  "Hanna Danström|0": "foh-am",
  "Hanna Danström|1": "foh-am",
  "Hanna Danström|2": "foh-am",
  "Hanna Danström|3": "foh-am",
  "Liv Wikström|0": "runner-am",
  "Liv Wikström|1": "runner-am",
  "Liv Wikström|2": "runner-am",
  "Liv Wikström|3": "runner-am",
  "Liv Wikström|4": "runner-am",
  "Teodor Warpe|0": "foh-pm",
  "Teodor Warpe|1": "foh-pm",
  "Teodor Warpe|2": "foh-pm",
  "Teodor Warpe|3": "foh-pm",
  "Teodor Warpe|4": "foh-pm",
  "Felix Rosendahl Nilsson|0": "pm-runner",
  "Felix Rosendahl Nilsson|1": "pm-runner",
  "Felix Rosendahl Nilsson|2": "pm-runner",
  "Felix Rosendahl Nilsson|3": "pm-runner",
  "Felix Rosendahl Nilsson|4": "pm-runner",
  "Elsa Hall|0": "pm-runner",
  "Elsa Hall|1": "pm-runner",
  "Elsa Hall|2": "pm-runner",
  "Elsa Hall|3": "pm-runner",
  "Elsa Hall|4": "foh-pm",
  "Buster Lind|0": "pm-close",
  "Buster Lind|1": "pm-close",
  "Buster Lind|2": "pm-close",
  "Buster Lind|3": "pm-close",
  "Buster Lind|4": "pm-close",
  "Svea Grundin|0": "pm-close",
  "Svea Grundin|1": "pm-close",
  "Svea Grundin|2": "pm-close",
  "Svea Grundin|3": "pm-close",
  "Svea Grundin|4": "pm-close",
  "Graeme Wylie|0": "admin",
  "Graeme Wylie|1": "admin",
  "Graeme Wylie|2": "admin",
  "Graeme Wylie|3": "admin",
  "Graeme Wylie|4": "admin",
  "Thea Mohr Malm|4": "foh-am",
  "Thea Mohr Malm|5": "foh-am",
  "Thea Mohr Malm|6": "foh-am",
  "Stella Rosenblatt Mörner|4": "foh-pm",
  "Stella Rosenblatt Mörner|5": "foh-pm",
  "Stella Rosenblatt Mörner|6": "foh-pm",
  "Sophie Bielke|4": "pm-runner",
  "Sophie Bielke|5": "pm-runner",
  "Sophie Bielke|6": "pm-runner",
  "Jacqueline Lydmar|5": "pm-close",
  "Jacqueline Lydmar|6": "pm-close",
  "Mika Knutson|5": "foh-pm",
  "Mika Knutson|6": "foh-pm",
  "Alice Murby Hamilton|6": "foh-pm",
  "Maya Hedman|5": "runner-am",
  "Maya Hedman|6": "runner-am",
  "Katherine Breton|5": "foh-pm",
  "Molly Soneson|5": "pm-runner",
  "Molly Soneson|6": "pm-runner",
  "Ebba Movander|5": "pm-close",
  "Ebba Movander|6": "pm-close",
};

const W47 = {
  "Emma Chipman|0": "avbak",
  "Emma Chipman|1": "avbak",
  "Emma Chipman|2": "bord-early",
  "Emma Chipman|3": "bord-early",
  "Freddy Etnebreith Arraez Quartararo|2": "avbak",
  "Freddy Etnebreith Arraez Quartararo|3": "avbak",
  "Freddy Etnebreith Arraez Quartararo|4": "bord-early",
  "Freddy Etnebreith Arraez Quartararo|5": "avbak-helg",
  "Freddy Etnebreith Arraez Quartararo|6": "avbak-helg",
  "Giovanny Miguel Quartararo Martinez|0": "bord-early",
  "Giovanny Miguel Quartararo Martinez|3": "bord-early",
  "Giovanny Miguel Quartararo Martinez|4": "bord-late",
  "Giovanny Miguel Quartararo Martinez|5": "avbak-helg",
  "Giovanny Miguel Quartararo Martinez|6": "avbak-helg",
  "Hasan Tunahan Tolan|0": "bord-late",
  "Hasan Tunahan Tolan|1": "bord-late",
  "Hasan Tunahan Tolan|2": "bord-late",
  "Hasan Tunahan Tolan|4": "avbak",
  "Jonatan Almendra|1": "bord-early",
  "Jonatan Almendra|2": "bord-early",
  "Jonatan Almendra|3": "bord-late",
  "Jonatan Almendra|4": "bord-early",
  "Meja Jansson|0": "bord-early",
  "Meja Jansson|1": "bord-early",
  "Meja Jansson|2": "bord-early",
  "Meja Jansson|3": "bord-early",
  "Jasmin Ahmad|0": "kit-am",
  "Jasmin Ahmad|4": "kit-prep",
  "James Christopher Kendi|0": "kit-prep",
  "James Christopher Kendi|1": "kit-prep",
  "James Christopher Kendi|2": "kit-prep",
  "James Christopher Kendi|3": "kit-prep",
  "Valeria Viitiuk|0": "kit-pm",
  "Valeria Viitiuk|1": "kit-am",
  "Valeria Viitiuk|4": "kit-pm",
  "Valeria Viitiuk|5": "kit-pm",
  "Anna Denysiuk|2": "kit-am",
  "Anna Denysiuk|3": "kit-am",
  "Anna Denysiuk|5": "kit-am-sat",
  "Anna Denysiuk|6": "kit-pm",
  "Viktoriia Maistriuk|1": "kit-pm",
  "Viktoriia Maistriuk|2": "kit-pm",
  "Viktoriia Maistriuk|3": "kit-pm",
  "Viktoriia Maistriuk|6": "kit-am",
  "Hanna Danström|0": "foh-am",
  "Hanna Danström|1": "foh-am",
  "Hanna Danström|2": "foh-am",
  "Hanna Danström|3": "foh-am",
  "Hanna Danström|4": "foh-am",
  "Liv Wikström|0": "runner-am",
  "Liv Wikström|1": "runner-am",
  "Liv Wikström|2": "runner-am",
  "Liv Wikström|3": "runner-am",
  "Liv Wikström|4": "runner-am",
  "Teodor Warpe|0": "foh-pm",
  "Teodor Warpe|1": "foh-pm",
  "Teodor Warpe|2": "foh-pm",
  "Teodor Warpe|3": "foh-pm",
  "Teodor Warpe|6": "foh-pm",
  "Felix Rosendahl Nilsson|0": "pm-runner",
  "Felix Rosendahl Nilsson|1": "pm-runner",
  "Felix Rosendahl Nilsson|2": "pm-runner",
  "Felix Rosendahl Nilsson|3": "pm-runner",
  "Felix Rosendahl Nilsson|4": "pm-runner",
  "Elsa Hall|0": "pm-runner",
  "Elsa Hall|1": "pm-runner",
  "Elsa Hall|2": "pm-runner",
  "Elsa Hall|3": "pm-runner",
  "Elsa Hall|4": "foh-pm",
  "Buster Lind|0": "pm-close",
  "Buster Lind|1": "pm-close",
  "Buster Lind|2": "pm-close",
  "Buster Lind|3": "pm-close",
  "Buster Lind|4": "pm-close",
  "Svea Grundin|0": "pm-close",
  "Svea Grundin|1": "pm-close",
  "Svea Grundin|2": "pm-close",
  "Svea Grundin|3": "pm-close",
  "Svea Grundin|4": "pm-close",
  "Graeme Wylie|1": "admin",
  "Graeme Wylie|2": "admin",
  "Graeme Wylie|3": "admin",
  "Graeme Wylie|4": "admin",
  "Graeme Wylie|5": "admin",
  "Mika Knutson|4": "foh-pm",
  "Stella Rosenblatt Mörner|4": "foh-pm",
  "Mio Ollinen|4": "pm-runner",
  "Mio Ollinen|5": "runner-am",
  "Mio Ollinen|6": "runner-am",
  "Greta Sandström|5": "foh-am",
  "Greta Sandström|6": "foh-am",
  "Agnes Skantze|5": "foh-pm",
  "Agnes Skantze|6": "foh-pm",
  "Edwin Zillen|5": "foh-pm",
  "Edwin Zillen|6": "foh-pm",
  "Viggo Onyango|5": "foh-pm",
  "Viggo Onyango|6": "pm-close",
  "Alice Murby Hamilton|5": "pm-runner",
  "Alice Murby Hamilton|6": "pm-runner",
  "Molly Soneson|5": "pm-runner",
  "Molly Soneson|6": "pm-runner",
  "Kalle Knutson|5": "pm-close",
  "Kalle Knutson|6": "pm-close",
  "Ebba Movander|5": "pm-close",
};

function toneFor(group) {
  if (group === "Bakery") return "bakery";
  if (group === "Kitchen") return "kitchen";
  if (group === "Admin") return "admin";
  if (group === "FOH Vasastan") return "erik";
  return "foh";
}

function mondayOf(date) {
  const copy = new Date(date);
  const day = (copy.getDay() + 6) % 7;
  copy.setDate(copy.getDate() - day);
  copy.setHours(12, 0, 0, 0);
  return copy;
}

function isoWeek(date) {
  const monday = mondayOf(date);
  const jan4 = new Date(monday.getFullYear(), 0, 4);
  const week1 = mondayOf(jan4);
  return 1 + Math.round((monday - week1) / 604800000);
}

function isoWeekYear(date) {
  const monday = mondayOf(date);
  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  return thursday.getFullYear();
}

function isoWeekNumber(date) {
  const monday = mondayOf(date);
  const week1 = mondayOf(new Date(isoWeekYear(monday), 0, 4));
  return 1 + Math.round((monday - week1) / 604800000);
}

function mondayOfIsoWeek(weekYear, week) {
  const monday = mondayOf(new Date(weekYear, 0, 4));
  monday.setDate(monday.getDate() + (week - 1) * 7);
  return monday;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoWeeksInYear(year) {
  const jan1 = new Date(year, 0, 1).getDay();
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return jan1 === 4 || (leap && jan1 === 3) ? 53 : 52;
}

function lastYearSameWeekday(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  const weekYear = isoWeekYear(date);
  const prevYear = weekYear - 1;
  let week = isoWeekNumber(date);
  const weeks = isoWeeksInYear(prevYear);
  if (week > weeks) week = weeks;
  const weekday = (date.getDay() + 6) % 7;
  const prev = mondayOfIsoWeek(prevYear, week);
  prev.setDate(prev.getDate() + weekday);
  return toIsoDate(prev);
}

function formatRange(monday) {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${fmt(monday)}–${fmt(sunday)}`;
}

function storageKey(site, monday) {
  return `stora-schema:${site}:${monday.toISOString().slice(0, 10)}:foh79`;
}

const SITE_SHORT = { ostermalm: "Östermalm", vasastan: "St Erik" };

function otherSiteKey() {
  return state.site === "ostermalm" ? "vasastan" : "ostermalm";
}

function homeRoster(site = state.site) {
  return site === "ostermalm" ? OSTERMALM : VASASTAN;
}

function knownPerson(name) {
  return OSTERMALM.find((person) => person.name === name) || VASASTAN.find((person) => person.name === name);
}

function asSitePerson(person, site = state.site) {
  if (!person) return null;
  if (site === "vasastan") {
    return { name: person.name, group: "FOH Vasastan", shifts: erik, tone: "erik" };
  }
  const home = OSTERMALM.find((row) => row.name === person.name);
  if (home) return home;
  return { name: person.name, group: "FOH", shifts: foh, tone: "foh" };
}

function dualSiteNames() {
  const ost = new Set(OSTERMALM.map((person) => person.name));
  return new Set(VASASTAN.map((person) => person.name).filter((name) => ost.has(name)));
}

function seedOstermalmCells() {
  const mondayISO = state.monday.toISOString().slice(0, 10);
  if (mondayISO === "2026-11-16") return migrateOstermalmCells({ ...W47 });
  if (mondayISO === "2026-11-09") return migrateOstermalmCells({ ...W46 });
  if (mondayISO === "2026-11-02") return migrateOstermalmCells({ ...W45 });
  return {};
}

function seedVasastanCells() {
  const mondayISO = state.monday.toISOString().slice(0, 10);
  if (mondayISO === "2026-11-02") return { ...W45_VASASTAN };
  return {};
}

function cellsForSite(site) {
  const saved = localStorage.getItem(storageKey(site, state.monday));
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return site === "ostermalm" ? migrateOstermalmCells(parsed) : parsed;
    } catch (err) {
      return {};
    }
  }
  return site === "ostermalm" ? seedOstermalmCells() : seedVasastanCells();
}

function otherShift(name, dayIndex) {
  const raw = (state.otherCells || {})[cellId(name, dayIndex)];
  const id = cellShiftId(raw);
  if (!id || id === "off") return null;
  const person = asSitePerson(knownPerson(name), otherSiteKey());
  const shift = person?.shifts.find((item) => item.id === id);
  return {
    id,
    label: shift ? shiftName(shift) : id,
    clock: shift ? shiftClock(shift) : "",
  };
}

function otherSiteDays(name) {
  return DAYS.map((weekday, dayIndex) => {
    const shift = otherShift(name, dayIndex);
    return shift ? { weekday, dayIndex, shiftLabel: shift.label, clock: shift.clock } : null;
  }).filter(Boolean);
}

function awayChipHtml(name, dayIndex) {
  const away = otherShift(name, dayIndex);
  if (!away) return "";
  const clock = away.clock ? ` · ${away.clock}` : "";
  return `<div class="away-chip">${SITE_SHORT[otherSiteKey()]} · ${away.label}${clock}</div>`;
}

function personNameHtml(person) {
  const personHours = personWeekHours(person);
  const bits = [];
  if (personHours) bits.push(`<small>${personHours.toFixed(personHours % 1 ? 1 : 0)} h</small>`);
  const away = otherSiteDays(person.name);
  const dual = dualSiteNames().has(person.name);
  const otherLabel = SITE_SHORT[otherSiteKey()];
  if (away.length) {
    bits.push(
      `<small class="site-tag">${otherLabel} · ${away.map((day) => `${day.weekday} ${day.shiftLabel}`).join(", ")}</small>`,
    );
  } else if (dual) {
    bits.push(`<small class="site-tag">Works ${SITE_SHORT.ostermalm} + ${SITE_SHORT.vasastan}</small>`);
  }
  return `${person.name}${bits.join("")}`;
}

const FOH_BUCKETS = {
  "foh-open": "open",
  "foh-pm": "pm",
  "pm-runner": "pmRunner",
  "pm-runner-late": "pmRunnerLate",
  "pm-close": "pmClose",
  "runner-am": "amRunner",
};

const FOH_COVERAGE = [
  { key: "open", label: "FOH OPEN", weekday: 1, weekend: 1 },
  { key: "pm", label: "FOH PM", weekday: 1, weekend: 3 },
  { key: "pmRunner", label: "PM 08–17", weekday: 1, weekend: 1 },
  { key: "pmRunnerLate", label: "PM 11–17", weekday: 1, weekend: 1 },
  { key: "pmClose", label: "PM CLOSE", weekday: 2, weekend: 2 },
  { key: "amRunner", label: "AM RUNNER", weekday: 1, weekend: 1 },
];

const FOH_PASS_ORDER = ["foh-open", "foh-pm", "pm-runner", "pm-runner-late", "pm-close", "runner-am"];

const FOH_SHIFT_MIGRATE = {
  "foh-am": "foh-open",
  "foh-mid": "runner-am",
  "mid-weekend": "runner-am",
  "foh-close": "foh-pm",
  "foh-close-wknd": "foh-pm",
};

function fohNeeded(dayIndex) {
  const weekend = dayIndex >= 4;
  const needed = { extra: 0 };
  FOH_COVERAGE.forEach((row) => {
    needed[row.key] = weekend ? row.weekend : row.weekday;
  });
  return needed;
}

const state = {
  site: "ostermalm",
  monday: mondayOf(new Date(2026, 10, 16)),
  cells: {},
  boardView: localStorage.getItem("stora.boardView") === "pass" ? "pass" : "personal",
};

const rates = {
  rateVersion: 2,
  fohAvg: 153,
  kitchenAvg: 153,
  bakeryAvg: 0,
  targetFohPct: 21,
  semesterPct: 12,
  agaPct: 31.42,
  hourly: {},
  salary: [],
};
let salesDaysIndex = {};

function formatKr(n) {
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0")}\u00a0kr`;
}

function parseClock(raw) {
  const text = String(raw || "")
    .trim()
    .replace(".", ":")
    .replace(";", ":");
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2] || "0");
  if (hour > 23 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function hoursFromTimes(start, end) {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  let mins = endH * 60 + endM - (startH * 60 + startM);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

function shiftHours(label) {
  const times = parseShiftTimes(label);
  return times ? hoursFromTimes(times.start, times.end) : 0;
}

function cellEntry(raw) {
  if (!raw || raw === "off") return { id: "off" };
  if (typeof raw === "string") return { id: raw };
  if (typeof raw === "object" && raw.id) return { id: raw.id, start: raw.start, end: raw.end };
  return { id: "off" };
}

function cellShiftId(raw) {
  return cellEntry(raw).id;
}

function shiftDefaults(person, shiftId) {
  const shift = person?.shifts.find((item) => item.id === shiftId);
  return parseShiftTimes(shift?.label);
}

function cellTimes(person, raw) {
  const cell = cellEntry(raw);
  if (cell.id === "off") return null;
  const defaults = shiftDefaults(person, cell.id);
  const start = cell.start || defaults?.start || "";
  const end = cell.end || defaults?.end || "";
  if (!start || !end) return null;
  return {
    start,
    end,
    comment: defaults?.comment || "",
    custom: Boolean((cell.start && cell.start !== defaults?.start) || (cell.end && cell.end !== defaults?.end)),
  };
}

function cellHours(person, raw) {
  const times = cellTimes(person, raw);
  return times ? hoursFromTimes(times.start, times.end) : 0;
}

function writeCell(key, person, shiftId, start, end) {
  if (!shiftId || shiftId === "off") {
    delete state.cells[key];
    return;
  }
  const defaults = shiftDefaults(person, shiftId);
  const nextStart = start || defaults?.start;
  const nextEnd = end || defaults?.end;
  const custom = Boolean(defaults && (nextStart !== defaults.start || nextEnd !== defaults.end));
  state.cells[key] = custom ? { id: shiftId, start: nextStart, end: nextEnd } : shiftId;
}

function personWeekHours(person) {
  return DAYS.reduce((sum, _, dayIndex) => {
    const raw = state.cells[cellId(person.name, dayIndex)];
    if (cellShiftId(raw) === "off") return sum;
    return sum + cellHours(person, raw);
  }, 0);
}

function shopKey() {
  return state.site === "vasastan" ? "vasastan" : "ostermalm";
}

function yearTargetPct() {
  const stored = localStorage.getItem("stora.yearlyTargetPct");
  return stored != null && stored !== "" ? Number(stored) : 10;
}

function deptAvg(group) {
  if (group === "Kitchen") return Number(rates.kitchenAvg || 0);
  if (group === "Bakery") return Number(rates.bakeryAvg || 0);
  return Number(rates.fohAvg || 0);
}

function loadFactor() {
  const semester = 1 + Number(rates.semesterPct != null ? rates.semesterPct : 12) / 100;
  const aga = 1 + Number(rates.agaPct != null ? rates.agaPct : 31.42) / 100;
  return semester * aga;
}

function isSalary(person) {
  return Array.isArray(rates.salary) && rates.salary.includes(person.name);
}

function personBaseRate(person) {
  const override = Number(rates.hourly[person.name] || 0);
  if (override > 0) return override;
  if (isSalary(person)) return 0;
  return deptAvg(person.group);
}

function personRate(person) {
  return personBaseRate(person) * loadFactor();
}

function labourBucket(group) {
  if (group === "Kitchen") return "kitchen";
  if (group === "Bakery") return "bakery";
  if (group === "Admin") return "admin";
  return "foh";
}

function daySalesKr(dayIndex) {
  const shop = shopKey();
  const iso = isoDateForDay(dayIndex);
  const lastIso = lastYearSameWeekday(iso);
  const nowRow = salesDaysIndex[iso];
  const lastRow = salesDaysIndex[lastIso];
  const thisKr = (nowRow && nowRow[shop] ? nowRow[shop] : 0) / 100;
  const lastKr = (lastRow && lastRow[shop] ? lastRow[shop] : 0) / 100;
  return { thisKr, lastKr, used: thisKr || lastKr, lastYear: !thisKr && lastKr > 0, lastIso };
}

function weekSalesOre() {
  let sum = 0;
  let usedLastYear = false;
  for (let i = 0; i < 7; i += 1) {
    const day = daySalesKr(i);
    sum += day.used * 100;
    if (day.lastYear) usedLastYear = true;
  }
  return { ore: sum, lastYear: usedLastYear };
}

function formatPct(n) {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function saveRates() {
  localStorage.setItem("stora.staffRates", JSON.stringify(rates));
  fetch("/api/staff-rates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(rates),
  }).catch(() => {});
}

function people() {
  const home = homeRoster();
  const seen = new Set(home.map((person) => person.name));
  const extras = [];
  Object.entries(state.cells).forEach(([key, raw]) => {
    if (cellShiftId(raw) === "off") return;
    const name = key.split("|")[0];
    if (seen.has(name)) return;
    const source = knownPerson(name);
    if (!source) return;
    extras.push(asSitePerson(source));
    seen.add(name);
  });
  extras.sort((a, b) => a.name.localeCompare(b.name, "sv"));
  return extras.length ? [...home, ...extras] : home;
}

function swapCandidates(group) {
  const here = new Set(people().filter((person) => person.group === group).map((person) => person.name));
  const other = state.site === "ostermalm" ? VASASTAN : OSTERMALM.filter((person) => person.group === "FOH");
  return other.filter((person) => !here.has(person.name)).map((person) => asSitePerson(person));
}

function findPerson(roster, name) {
  return roster.find((person) => person.name === name) || asSitePerson(knownPerson(name));
}

function migrateOstermalmCells(cells) {
  const next = {};
  const runnersByDay = {};
  Object.entries(cells).forEach(([key, raw]) => {
    const entry = cellEntry(raw);
    const id = FOH_SHIFT_MIGRATE[entry.id] || entry.id;
    next[key] = entry.start ? { id, start: entry.start, end: entry.end } : id;
    if (id === "pm-runner") {
      const day = key.split("|")[1];
      (runnersByDay[day] ||= []).push(key);
    }
  });
  Object.values(runnersByDay).forEach((keys) => {
    keys.slice(1).forEach((key) => {
      const entry = cellEntry(next[key]);
      next[key] = entry.start ? { id: "pm-runner-late", start: entry.start, end: entry.end } : "pm-runner-late";
    });
  });
  return next;
}

function loadCells() {
  state.cells = cellsForSite(state.site);
  state.otherCells = cellsForSite(otherSiteKey());
}

function saveCells() {
  localStorage.setItem(storageKey(state.site, state.monday), JSON.stringify(state.cells));
}

function cellId(name, dayIndex) {
  return `${name}|${dayIndex}`;
}

function dayHeaders() {
  return DAYS.map((label, index) => {
    const day = new Date(state.monday);
    day.setDate(state.monday.getDate() + index);
    return `${label} ${day.getDate()}/${day.getMonth() + 1}`;
  });
}

function shiftName(shift) {
  return shift.label.split(" · ")[0];
}

function shiftClock(shift) {
  const times = parseShiftTimes(shift.label);
  return times ? `${times.start}–${times.end}` : "";
}

function orderedShifts(list, prefer) {
  const rest = list.filter((shift) => shift.id !== "off");
  if (!prefer) return rest;
  const preferred = prefer.map((id) => rest.find((shift) => shift.id === id)).filter(Boolean);
  return [...preferred, ...rest.filter((shift) => !prefer.includes(shift.id))];
}

function passCatalog() {
  if (state.site === "vasastan") {
    return [{ group: "FOH Vasastan", tone: "erik", shifts: orderedShifts(erik) }];
  }
  return [
    { group: "Bakery", tone: "bakery", shifts: orderedShifts(bakery) },
    { group: "Kitchen", tone: "kitchen", shifts: orderedShifts(kitchen) },
    { group: "FOH", tone: "foh", shifts: orderedShifts(foh, FOH_PASS_ORDER) },
    { group: "Admin", tone: "admin", shifts: orderedShifts(admin) },
  ];
}

function timeRowHtml(person, dayIndex, raw) {
  const times = cellTimes(person, raw);
  if (!times) return "";
  const dayHours = hoursFromTimes(times.start, times.end);
  return `<div class="cell-times"${times.custom ? ' data-custom="1"' : ""}><input class="time-input" data-name="${person.name}" data-day="${dayIndex}" data-bound="start" value="${times.start}" maxlength="5" inputmode="numeric" aria-label="Start"><span>–</span><input class="time-input" data-name="${person.name}" data-day="${dayIndex}" data-bound="end" value="${times.end}" maxlength="5" inputmode="numeric" aria-label="End"><em>${dayHours.toFixed(dayHours % 1 ? 1 : 0)}h</em></div>`;
}

function tallyWeek(roster) {
  let filled = 0;
  let hours = 0;
  let staffCost = 0;
  let shopHours = 0;
  let shopCost = 0;
  let bakeHours = 0;
  let bakeCost = 0;
  let adminHours = 0;
  let adminCost = 0;
  const working = new Set();
  roster.forEach((person) => {
    const personHours = personWeekHours(person);
    const cost = personHours * personRate(person);
    hours += personHours;
    staffCost += cost;
    const bucket = labourBucket(person.group);
    if (bucket === "bakery") {
      bakeHours += personHours;
      bakeCost += cost;
    } else if (bucket === "admin") {
      adminHours += personHours;
      adminCost += cost;
    } else {
      shopHours += personHours;
      shopCost += cost;
    }
    DAYS.forEach((_, dayIndex) => {
      if (cellShiftId(state.cells[cellId(person.name, dayIndex)]) === "off") return;
      filled += 1;
      working.add(person.name);
    });
  });
  return { filled, hours, staffCost, working, shopHours, shopCost, bakeHours, bakeCost, adminHours, adminCost };
}

function paintWeekStats(stats) {
  const sales = weekSalesOre();
  const salesKr = sales.ore / 100;
  const wagePct = sales.ore && stats.shopCost ? stats.shopCost / salesKr : null;
  const bakePct = sales.ore && stats.bakeCost ? stats.bakeCost / salesKr : null;
  document.getElementById("shiftCount").textContent = String(stats.filled);
  document.getElementById("peopleCount").textContent = String(stats.working.size);
  document.getElementById("weekHours").textContent = stats.shopHours
    ? stats.shopHours.toFixed(stats.shopHours % 1 ? 1 : 0)
    : "0";
  document.getElementById("weekCost").textContent = stats.shopCost ? formatKr(stats.shopCost) : "—";
  document.getElementById("weekWage").textContent = wagePct != null ? `${(wagePct * 100).toFixed(1)}%` : "—";
  const bakeEl = document.getElementById("weekBake");
  if (bakeEl) bakeEl.textContent = bakePct != null ? `${(bakePct * 100).toFixed(1)}%` : "—";
  const wageHint = document.getElementById("weekWage").nextElementSibling;
  if (wageHint) {
    const target = Number(rates.targetFohPct || 21);
    wageHint.textContent = sales.lastYear
      ? `FOH + kitchen vs last year · target ${target}%`
      : `FOH + kitchen · target ${target}%`;
  }
}

function personalBoardHtml(roster) {
  const headers = ["Person", "kr/h", ...dayHeaders()];
  const groups = [];
  roster.forEach((person) => {
    const last = groups[groups.length - 1];
    if (!last || last.group !== person.group) groups.push({ group: person.group, people: [person] });
    else last.people.push(person);
  });
  const body = groups
    .map((block) => {
      const rows = block.people
        .map((person) => {
          const hourly = Number(rates.hourly[person.name] || 0);
          const placeholder = isSalary(person) && !hourly ? "salary" : String(deptAvg(person.group) || 0);
          const selects = DAYS.map((_, dayIndex) => {
            const key = cellId(person.name, dayIndex);
            const raw = state.cells[key] || "off";
            const shiftId = cellShiftId(raw);
            const options = person.shifts
              .map((shift) => `<option value="${shift.id}" ${shift.id === shiftId ? "selected" : ""}>${shift.label}</option>`)
              .join("");
            const tone = shiftId === "off" ? "off" : person.tone;
            const clash = shiftId !== "off" && otherShift(person.name, dayIndex) ? ' data-clash="1"' : "";
            return `<td><div class="cell-shift"${clash}><select class="shift ${tone}" data-name="${person.name}" data-day="${dayIndex}">${options}</select>${timeRowHtml(person, dayIndex, raw)}${awayChipHtml(person.name, dayIndex)}</div></td>`;
          }).join("");
          return `<tr><td class="name">${personNameHtml(person)}</td><td class="rate"><input class="rate-input" data-name="${person.name}" inputmode="decimal" placeholder="${placeholder}" value="${hourly ? String(hourly) : ""}"></td>${selects}</tr>`;
        })
        .join("");
      return `<tr class="group-row"><td colspan="9">${block.group}</td></tr>${rows}`;
    })
    .join("");
  return `<table><thead><tr>${headers.map((h, i) => `<th class="${i === 0 ? "name" : i === 1 ? "rate" : ""}">${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`;
}

function passBoardHtml(roster) {
  const headers = ["Pass", ...dayHeaders()];
  const body = passCatalog()
    .map((block) => {
      const peopleInGroup = roster.filter((person) => person.group === block.group);
      const visitors = swapCandidates(block.group);
      const pool = [...peopleInGroup, ...visitors];
      const otherLabel = SITE_SHORT[otherSiteKey()];
      const rows = block.shifts
        .map((shift) => {
          let weekHours = 0;
          const cells = DAYS.map((_, dayIndex) => {
            const assigned = peopleInGroup.filter(
              (person) => cellShiftId(state.cells[cellId(person.name, dayIndex)]) === shift.id,
            );
            const cards = assigned
              .map((person) => {
                const raw = state.cells[cellId(person.name, dayIndex)];
                weekHours += cellHours(person, raw);
                const options = pool
                  .map((row) => `<option value="${row.name}" ${row.name === person.name ? "selected" : ""}>${row.name}</option>`)
                  .join("");
                return `<div class="pass-card"><select class="shift ${person.tone} pass-who" data-name="${person.name}" data-day="${dayIndex}" data-shift="${shift.id}">${options}<option value="off">Remove</option></select>${timeRowHtml(person, dayIndex, raw)}${awayChipHtml(person.name, dayIndex)}</div>`;
              })
              .join("");
            const taken = new Set(assigned.map((person) => person.name));
            const addHome = peopleInGroup
              .filter((person) => !taken.has(person.name))
              .map((person) => `<option value="${person.name}">${person.name}</option>`);
            const addAway = visitors
              .filter((person) => !taken.has(person.name))
              .map((person) => `<option value="${person.name}">${person.name} · ${otherLabel}</option>`);
            const addOptions = [...addHome, ...addAway].join("");
            return `<td><div class="pass-cell">${cards}<select class="shift off pass-add" data-shift="${shift.id}" data-day="${dayIndex}"><option value="">Add</option>${addOptions}</select></div></td>`;
          }).join("");
          const clock = shiftClock(shift);
          const hourLabel = weekHours ? `${weekHours.toFixed(weekHours % 1 ? 1 : 0)} h` : "";
          return `<tr><td class="name">${shiftName(shift)}${clock || hourLabel ? `<small>${[clock, hourLabel].filter(Boolean).join(" · ")}</small>` : ""}</td>${cells}</tr>`;
        })
        .join("");
      return `<tr class="group-row"><td colspan="8">${block.group}</td></tr>${rows}`;
    })
    .join("");
  return `<table><thead><tr>${headers.map((h, i) => `<th class="${i === 0 ? "name" : ""}">${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`;
}

function bindBoard(roster) {
  document.querySelectorAll("select.shift:not(.pass-add):not(.pass-who)").forEach((select) => {
    select.addEventListener("change", () => {
      const key = cellId(select.dataset.name, select.dataset.day);
      const person = findPerson(roster, select.dataset.name);
      writeCell(key, person, select.value);
      saveCells();
      render();
    });
  });
  document.querySelectorAll("select.pass-who").forEach((select) => {
    select.addEventListener("change", () => {
      const day = select.dataset.day;
      const shiftId = select.dataset.shift;
      const fromName = select.dataset.name;
      const fromPerson = findPerson(roster, fromName);
      const raw = state.cells[cellId(fromName, day)];
      const times = cellTimes(fromPerson, raw);
      delete state.cells[cellId(fromName, day)];
      if (select.value && select.value !== "off") {
        const toPerson = findPerson(roster, select.value);
        writeCell(cellId(select.value, day), toPerson, shiftId, times?.start, times?.end);
      }
      saveCells();
      render();
    });
  });
  document.querySelectorAll("select.pass-add").forEach((select) => {
    select.addEventListener("change", () => {
      if (!select.value) return;
      const person = findPerson(roster, select.value);
      writeCell(cellId(select.value, select.dataset.day), person, select.dataset.shift);
      saveCells();
      render();
    });
  });
  document.querySelectorAll("input.time-input").forEach((input) => {
    input.addEventListener("change", () => {
      const key = cellId(input.dataset.name, input.dataset.day);
      const person = findPerson(roster, input.dataset.name);
      const box = input.closest(".cell-times");
      const start = parseClock(box.querySelector('[data-bound="start"]').value);
      const end = parseClock(box.querySelector('[data-bound="end"]').value);
      if (!start || !end) {
        render();
        return;
      }
      writeCell(key, person, cellShiftId(state.cells[key]), start, end);
      saveCells();
      render();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") input.blur();
    });
  });
  document.querySelectorAll("input.rate-input").forEach((input) => {
    input.addEventListener("change", () => {
      const kr = Number(String(input.value).replace(",", "."));
      if (!Number.isFinite(kr) || kr <= 0) delete rates.hourly[input.dataset.name];
      else rates.hourly[input.dataset.name] = Math.round(kr);
      saveRates();
      render();
    });
  });
}

function render() {
  state.otherCells = cellsForSite(otherSiteKey());
  const roster = people();
  document.getElementById("weekLabel").textContent = `Week ${isoWeek(state.monday)}`;
  document.getElementById("dateRange").textContent = formatRange(state.monday);
  document.getElementById("hint").textContent =
    state.boardView === "pass"
      ? "Each row is a named pass. The names in the cells are who is on it that day. Add or swap people here, or switch back to Personal."
      : state.site === "vasastan"
        ? "Pick a named shift, then trim the times if you need the hours down. People who also work Östermalm show that shop under their name. Add Östermalm staff from Pass view."
        : "FOH is 7 Mon–Thu and 9 Fri–Sun: Open, AM Runner, FOH PM, PM Runner 08–17, PM Runner 11–17, two closes. Weekend adds two extra FOH PM. People who also work St Erik show that shop under their name.";

  document.querySelectorAll("[data-site]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.site === state.site);
  });
  document.querySelectorAll("[data-board]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.board === state.boardView);
  });

  paintWeekStats(tallyWeek(roster));
  renderLabourSheet();
  renderFohCoverage();
  const board = document.getElementById("board");
  board.classList.toggle("pass-view", state.boardView === "pass");
  board.innerHTML = state.boardView === "pass" ? passBoardHtml(roster) : personalBoardHtml(roster);
  bindBoard(roster);
}

function renderLabourSheet() {
  const table = document.getElementById("labourTable");
  if (!table) return;
  const roster = people();
  const fohAvg = Number(rates.fohAvg || 0);
  const kitAvg = Number(rates.kitchenAvg || 0);
  const bakeAvg = Number(rates.bakeryAvg || 0);
  const targetPct = Number(rates.targetFohPct || 0) / 100;
  const grow = 1 + yearTargetPct() / 100;
  const days = DAYS.map((label, dayIndex) => {
    const hours = { foh: 0, kitchen: 0, bakery: 0, admin: 0 };
    const cost = { foh: 0, kitchen: 0, bakery: 0, admin: 0 };
    roster.forEach((person) => {
      const raw = state.cells[cellId(person.name, dayIndex)];
      if (cellShiftId(raw) === "off") return;
      const h = cellHours(person, raw);
      const bucket = labourBucket(person.group);
      hours[bucket] += h;
      cost[bucket] += h * personRate(person);
    });
    const sales = daySalesKr(dayIndex);
    const fohCost = cost.foh;
    const kitCost = cost.kitchen;
    const bakeCost = cost.bakery;
    const adminCost = cost.admin;
    const shop = fohCost + kitCost;
    const total = shop + bakeCost + adminCost;
    const targetSales = (sales.lastKr || sales.thisKr) * grow;
    const fohLoaded = fohAvg * loadFactor();
    const targetHours = fohLoaded && targetPct ? (targetSales * targetPct) / fohLoaded : 0;
    return { label, hours, fohCost, kitCost, bakeCost, adminCost, shop, total, sales, targetSales, targetHours, iso: isoDateForDay(dayIndex) };
  });
  const tot = days.reduce(
    (acc, d) => {
      acc.foh += d.hours.foh;
      acc.kitchen += d.hours.kitchen;
      acc.bakery += d.hours.bakery;
      acc.admin += d.hours.admin;
      acc.fohCost += d.fohCost;
      acc.kitCost += d.kitCost;
      acc.bakeCost += d.bakeCost;
      acc.adminCost += d.adminCost;
      acc.shop += d.shop;
      acc.total += d.total;
      acc.used += d.sales.used;
      acc.last += d.sales.lastKr;
      acc.this += d.sales.thisKr;
      acc.targetSales += d.targetSales;
      acc.targetHours += d.targetHours;
      return acc;
    },
    { foh: 0, kitchen: 0, bakery: 0, admin: 0, fohCost: 0, kitCost: 0, bakeCost: 0, adminCost: 0, shop: 0, total: 0, used: 0, last: 0, this: 0, targetSales: 0, targetHours: 0 },
  );
  const cols = [...days, { ...tot, label: "Total", hours: { foh: tot.foh, kitchen: tot.kitchen, bakery: tot.bakery, admin: tot.admin }, fohCost: tot.fohCost, kitCost: tot.kitCost, bakeCost: tot.bakeCost, adminCost: tot.adminCost, shop: tot.shop, total: tot.total, sales: { used: tot.used, lastKr: tot.last, thisKr: tot.this }, targetSales: tot.targetSales, targetHours: tot.targetHours }];
  const hour = (n) => (n ? n.toFixed(n % 1 ? 1 : 0) : "0");
  const pct = (cost, sales) => (sales ? formatPct(cost / sales) : "—");
  const ok = (cost, sales) => {
    if (!sales || !targetPct) return "";
    return ` data-ok="${cost / sales <= targetPct + 0.01 ? "1" : "0"}"`;
  };
  const row = (label, cells, cls = "") =>
    `<tr class="${cls}"><td>${label}</td>${cells.map((c) => `<td class="num"${c.ok || ""}>${c.text}</td>`).join("")}</tr>`;
  const cells = (fn) => cols.map((d, i) => fn(d, i === cols.length - 1));
  table.innerHTML = `
    <thead><tr><th></th>${cols.map((d) => {
      if (d.label === "Total") return `<th class="num">Total</th>`;
      const now = d.iso ? d.iso.split("-") : null;
      const last = d.sales.lastIso ? d.sales.lastIso.split("-") : null;
      const nowLabel = now ? `${Number(now[2])}/${Number(now[1])}` : "";
      const lastLabel = last ? `vs ${Number(last[2])}/${Number(last[1])} ’${last[0].slice(2)}` : "";
      return `<th class="num">${d.label} ${nowLabel}<small>${lastLabel}</small></th>`;
    }).join("")}</tr></thead>
    <tbody>
      ${row("Sales", cells((d) => ({ text: d.sales.used ? formatKr(d.sales.used) : "—" })))}
      ${row("Last year", cells((d) => ({ text: d.sales.lastKr ? formatKr(d.sales.lastKr) : "—" })))}
      ${row(`Target sales (+${yearTargetPct()}%)`, cells((d) => ({ text: d.targetSales ? formatKr(d.targetSales) : "—" })))}
      ${row("Target FOH h", cells((d) => ({ text: hour(d.targetHours) })))}
      ${row("FOH hours", cells((d) => ({ text: hour(d.hours.foh) })))}
      ${row("FOH cost", cells((d) => ({ text: formatKr(d.fohCost) })))}
      ${row("FOH %", cells((d) => ({ text: pct(d.fohCost, d.sales.used), ok: ok(d.fohCost, d.sales.used) })))}
      ${row("Kitchen hours", cells((d) => ({ text: hour(d.hours.kitchen) })))}
      ${row("Kitchen cost", cells((d) => ({ text: formatKr(d.kitCost) })))}
      ${row("Kitchen %", cells((d) => ({ text: pct(d.kitCost, d.sales.used) })))}
      ${row("Total cost", cells((d) => ({ text: formatKr(d.shop) })), "labour-total")}
      ${row("Labour %", cells((d) => ({ text: pct(d.shop, d.sales.used), ok: ok(d.shop, d.sales.used) })), "labour-total")}
      ${row("Bakery hours", cells((d) => ({ text: hour(d.hours.bakery) })), "muted")}
      ${row("Bakery cost", cells((d) => ({ text: formatKr(d.bakeCost) })), "muted")}
      ${row("Bakery %", cells((d) => ({ text: pct(d.bakeCost, d.sales.used) })), "muted")}
      ${row("Admin hours", cells((d) => ({ text: hour(d.hours.admin) })), "muted")}
      ${row("Admin cost", cells((d) => ({ text: formatKr(d.adminCost) })), "muted")}
      ${row("Admin %", cells((d) => ({ text: pct(d.adminCost, d.sales.used) })), "muted")}
    </tbody>`;
}

function renderFohCoverage() {
  const box = document.getElementById("fohCoverage");
  if (state.site !== "ostermalm") {
    box.innerHTML = "";
    box.hidden = true;
    return;
  }
  box.hidden = false;
  const roster = people().filter((person) => person.group === "FOH");
  box.innerHTML = DAYS.map((label, dayIndex) => {
    const counts = { extra: 0 };
    FOH_COVERAGE.forEach((row) => {
      counts[row.key] = 0;
    });
    roster.forEach((person) => {
      const value = cellShiftId(state.cells[cellId(person.name, dayIndex)]);
      if (value === "off") return;
      const bucket = FOH_BUCKETS[value] || "extra";
      counts[bucket] += 1;
    });
    const needed = fohNeeded(dayIndex);
    const day = new Date(state.monday);
    day.setDate(state.monday.getDate() + dayIndex);
    const rows = FOH_COVERAGE.map((row) => {
      const got = counts[row.key];
      const want = needed[row.key];
      return `<span data-ok="${got === want ? "1" : "0"}">${row.label} ${got}/${want}</span>`;
    });
    if (counts.extra) rows.push(`<span data-ok="0">Other ${counts.extra}/0</span>`);
    return `<div class="coverage-day"><b>${label} ${day.getDate()}/${day.getMonth() + 1}</b>${rows.join("")}</div>`;
  }).join("");
}

document.querySelectorAll("[data-site]").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.site = btn.dataset.site;
    loadCells();
    render();
  });
});
document.querySelectorAll("[data-board]").forEach((btn) => {
  btn.addEventListener("click", () => {
    state.boardView = btn.dataset.board;
    localStorage.setItem("stora.boardView", state.boardView);
    render();
  });
});
document.getElementById("prev").addEventListener("click", () => {
  state.monday = new Date(state.monday.getTime() - 7 * 86400000);
  loadCells();
  render();
});
document.getElementById("next").addEventListener("click", () => {
  state.monday = new Date(state.monday.getTime() + 7 * 86400000);
  loadCells();
  render();
});
document.getElementById("resetWeek").addEventListener("click", () => {
  state.monday = mondayOf(new Date(2026, 10, 16));
  state.site = "ostermalm";
  localStorage.removeItem(storageKey(state.site, state.monday));
  loadCells();
  render();
});
document.getElementById("exportJson").addEventListener("click", () => {
  const roster = people();
  const payload = {
    site: state.site,
    week: isoWeek(state.monday),
    monday: state.monday.toISOString().slice(0, 10),
    shifts: Object.entries(state.cells).map(([key, raw]) => {
      const [name, day] = key.split("|");
      const person = roster.find((row) => row.name === name);
      const shiftId = cellShiftId(raw);
      const shift = person?.shifts.find((item) => item.id === shiftId);
      const times = cellTimes(person, raw);
      return {
        name,
        day: Number(day),
        shiftId,
        label: shift?.label || shiftId,
        start: times?.start,
        end: times?.end,
        hours: times ? hoursFromTimes(times.start, times.end) : 0,
      };
    }),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `stora-schema-w${payload.week}-${payload.site}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

const STATIONS = {
  ostermalm: { Bakery: 6, Kitchen: 4, FOH: 5, Admin: 9 },
  vasastan: { "FOH Vasastan": 13 },
};

const BOOKMARKLET =
  "javascript:void((function(){var s=document.createElement('script');s.src='http://127.0.0.1:8777/caspeco-bridge.js?t='+Date.now();document.body.appendChild(s)})())";

function stockholmToUtcIso(dateStr, hm) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = hm.split(":").map(Number);
  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wanted;
  for (let i = 0; i < 4; i += 1) {
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(guess));
    const value = (type) => Number(parts.find((part) => part.type === type).value);
    const got = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"));
    guess += wanted - got;
  }
  return new Date(guess).toISOString().replace(".000Z", "Z");
}

function parseShiftTimes(label) {
  const match = label && label.match(/(\d{2}:\d{2})–(\d{2}:\d{2})/);
  if (!match) return null;
  return { start: match[1], end: match[2], comment: label.split(" · ")[0] };
}

function isoDateForDay(dayIndex) {
  const day = new Date(state.monday);
  day.setDate(state.monday.getDate() + dayIndex);
  return toIsoDate(day);
}

async function queueCaspecoWeek() {
  const roster = people();
  const names = await fetch("employees.json").then((res) => res.json());
  const unmatched = new Set();
  const shifts = [];
  Object.entries(state.cells).forEach(([key, raw]) => {
    const shiftId = cellShiftId(raw);
    if (shiftId === "off") return;
    const [name, dayRaw] = key.split("|");
    const person = roster.find((row) => row.name === name);
    const times = cellTimes(person, raw);
    const employeeId = names[name];
    if (!employeeId) {
      unmatched.add(name);
      return;
    }
    if (!person || !times) return;
    const date = isoDateForDay(Number(dayRaw));
    const stationId = STATIONS[state.site][person.group];
    if (!stationId) return;
    const shopName = state.site === "vasastan" ? "St Erik" : "Östermalm";
    const passName = times.comment || "";
    const comment = passName ? `${shopName} · ${passName}` : shopName;
    shifts.push({
      name,
      employeeId,
      employmentId: employeeId,
      stationId,
      date,
      inTime: stockholmToUtcIso(date, times.start),
      outTime: stockholmToUtcIso(date, times.end),
      comment,
    });
  });
  const payload = {
    site: state.site,
    week: isoWeek(state.monday),
    monday: state.monday.toISOString().slice(0, 10),
    unmatched: [...unmatched],
    shifts,
  };
  const res = await fetch("/api/pending", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Could not queue the week. Start the app with python3 server.py");
  }
  return payload;
}

document.getElementById("bookmarklet").href = BOOKMARKLET;
document.getElementById("closeSend").addEventListener("click", () => {
  document.getElementById("sendPanel").classList.remove("open");
});
document.getElementById("sendCaspeco").addEventListener("click", async () => {
  const week = isoWeek(state.monday);
  const shop = state.site === "vasastan" ? "St Eriksgatan" : "Östermalm";
  const ok = confirm(
    `Save week ${week} for ${shop} in this app, ready to send?\n\nCaspeco is not changed until you open Caspeco and click the bookmark. Drafts stay unpublished.`,
  );
  if (!ok) return;
  try {
    const payload = await queueCaspecoWeek();
    const missing = payload.unmatched.length
      ? ` Skipped (not in Caspeco): ${payload.unmatched.join(", ")}.`
      : "";
    document.getElementById("sendTitle").textContent = `${payload.shifts.length} shifts queued`;
    document.getElementById("sendBody").innerHTML =
      `Week ${payload.week} · ${shop} is saved in this app only. When you are done, open Caspeco and click <strong>Send queued week</strong>.${missing}`;
    document.getElementById("sendPanel").classList.add("open");
  } catch (err) {
    alert(err.message || String(err));
  }
});

function applyRateFields(data, opts = {}) {
  if (!data || typeof data !== "object") return;
  if (opts.avgs !== false) {
    ["fohAvg", "kitchenAvg", "bakeryAvg", "targetFohPct", "semesterPct", "agaPct", "rateVersion"].forEach((key) => {
      if (data[key] != null && data[key] !== "") rates[key] = Number(data[key]);
    });
    if (Array.isArray(data.salary)) rates.salary = data.salary;
  }
  if (data.hourly && typeof data.hourly === "object") rates.hourly = { ...rates.hourly, ...data.hourly };
}

async function bootPlanner() {
  let fileVersion = 0;
  try {
    const res = await fetch("/api/staff-rates");
    if (res.ok) {
      const data = await res.json();
      applyRateFields(data);
      fileVersion = Number(data.rateVersion || 0);
    }
  } catch (err) {}
  try {
    const local = localStorage.getItem("stora.staffRates");
    if (local) {
      const data = JSON.parse(local);
      applyRateFields(data, { avgs: (data.rateVersion || 0) >= fileVersion });
    }
  } catch (err) {}
  try {
    const sales = await fetch("sales-days.json").then((res) => res.json());
    salesDaysIndex = sales.days || {};
  } catch (err) {
    salesDaysIndex = {};
  }
  [
    ["fohAvg", "fohAvg"],
    ["kitchenAvg", "kitchenAvg"],
    ["bakeryAvg", "bakeryAvg"],
    ["targetFohPct", "targetFohPct"],
  ].forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = String(rates[key]);
    el.addEventListener("change", () => {
      rates[key] = Number(el.value || 0);
      saveRates();
      render();
    });
  });
  loadCells();
  render();
}

bootPlanner();
