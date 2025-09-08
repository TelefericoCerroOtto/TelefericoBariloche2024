import { Postulation } from "./PostulationsTable";

export interface Option {
  key: string;
  label: string;
}

export const columns = [
  { key: "name", label: "Nombre Completo" },
  { key: "email", label: "Email" },
  { key: "age", label: "Edad" },
  { key: "genre", label: "Genero" },
  { key: "sector", label: "Sector De Postulacion" },
  { key: "campNo", label: "Campaña" },
  { key: "note", label: "Nota" },
  { key: "actions", label: "Acciones" },
];

export const allPostulations: Array<Postulation> = [
  {
    id: 1,
    name: "Juan Pérez",
    email: "juan.perez@example.com",
    age: 25,
    genre: "Masculino",
    sector: "Tecnología",
    campNo: 321,
    note: "Interesado en desarrollo web.",
    favorite: true,
  },
  {
    id: 2,
    name: "María López",
    email: "maria.lopez@example.com",
    age: 30,
    genre: "Femenino",
    sector: "Marketing",
    campNo: 1122,
    note: "Experiencia en estrategias digitales.",
    favorite: false,
  },
  {
    id: 3,
    name: "Carlos Martínez",
    email: "carlos.martinez@example.com",
    age: 28,
    genre: "Masculino",
    sector: "Tecnología",
    campNo: 0,
    note: "Interés en la enseñanza virtual.",
    favorite: true,
  },
  {
    id: 4,
    name: "Ana García",
    email: "ana.garcia@example.com",
    age: 22,
    genre: "Femenino",
    sector: "Marketing",
    campNo: 1122,
    note: "Estudiante de medicina.",
    favorite: false,
  },
  {
    id: 5,
    name: "Luis Fernández",
    email: "luis.fernandez@example.com",
    age: 35,
    genre: "Masculino",
    sector: "Ingeniería",
    campNo: 0,
    note: "Especialista en proyectos de construcción.",
    favorite: false,
  },
  {
    id: 6,
    name: "Sofía Torres",
    email: "sofia.torres@example.com",
    age: 27,
    genre: "Femenino",
    sector: "Finanzas",
    campNo: 1122,
    note: "Diseñadora gráfica freelance.",
    favorite: true,
  },
  {
    id: 7,
    name: "Ricardo Sánchez",
    email: "ricardo.sanchez@example.com",
    age: 29,
    genre: "Masculino",
    sector: "Finanzas",
    campNo: 321,
    note: "Analista financiero con experiencia en inversiones.",
    favorite: false,
  },
  {
    id: 8,
    name: "Elena Rodríguez",
    email: "elena.rodriguez@example.com",
    age: 24,
    genre: "Femenino",
    sector: "Ingeniería",
    campNo: 25,
    note: "Investigadora en biotecnología.",
    favorite: true,
  },
  {
    id: 9,
    name: "Tomás Gómez",
    email: "tomas.gomez@example.com",
    age: 31,
    genre: "Masculino",
    sector: "Turismo",
    campNo: 0,
    note: "Entrenador personal especializado en alto rendimiento.",
    favorite: true,
  },
  {
    id: 10,
    name: "Gabriela Méndez",
    email: "gabriela.mendez@example.com",
    age: 26,
    genre: "Femenino",
    sector: "Turismo",
    campNo: 1122,
    note: "Guía turística multilingüe.",
    favorite: true,
  },
];

export const favsPostulations: Array<Postulation> = allPostulations.filter(
  (postulation) => postulation.favorite,
);

export const sectorOptions: Option[] = [
  { key: "tech", label: "Tecnología" },
  { key: "marketing", label: "Marketing" },
  { key: "finances", label: "Finanzas" },
  { key: "engineer", label: "Ingeniería" },
  { key: "tourism", label: "Turismo" },
];

export const genreOptions = [
  { key: "male", label: "Masculino" },
  { key: "female", label: "Femenino" },
];
