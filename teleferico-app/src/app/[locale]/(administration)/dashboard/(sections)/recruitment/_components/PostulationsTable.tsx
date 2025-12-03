"use client";

import { TableContainer } from "@/components";
import { tableStyles } from "@/utils";
import {
  Pagination,
  Selection,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  User,
} from "@heroui/react";
import { useFormik } from "formik";
import { useEffect, useMemo, useState, type Key } from "react";
import ActionsButton from "./ActionsButton";
import {
  allPostulations,
  columns,
  favsPostulations,
  genderOptions,
  sectorOptions,
} from "./data";
import Filters from "./Filters";

export interface Postulation {
  id: number;
  name: string;
  email: string;
  age: number;
  gender: string;
  sector: string;
  campNo: number;
  note: string;
  favorite: boolean;
}

export interface FormData {
  name: string;
  minAge: number;
  maxAge: number;
  gender: string;
  sector: string;
  campNo: number;
}

interface Props {
  favs: boolean;
}

export const renderCell = (postulation: Postulation, columnKey: Key) => {
  const cellValue = postulation[columnKey as keyof Postulation];

  switch (columnKey) {
    case "name":
      return (
        <User
          avatarProps={{ radius: "lg" }}
          description={postulation.email}
          name={cellValue}
        >
          {postulation.email}
        </User>
      );

    case "email":
      return <span>{cellValue as string}</span>;

    case "age":
      return <span>{cellValue as string}</span>;

    case "role":
      return <span>{cellValue as string}</span>;

    case "gender":
      return <span>{cellValue as string}</span>;

    case "campNo":
      return cellValue ? <span>{cellValue as string}</span> : "-";

    case "note":
      return <span>{cellValue as string}</span>;

    case "actions":
      return (
        <ActionsButton
          id={postulation.id.toString()}
          isFavorite={postulation.favorite}
        />
      );

    default:
      return <span>{cellValue as string}</span>;
  }
};

export default function PostulationsTable(props: Props) {
  const { favs } = props;
  const onSubmit = (values: FormData) => {
    console.log("form values", values);
  };

  const [selectedRows, setSelectedRows] = useState<Selection>(new Set([]));
  const [postulations, setPostulations] = useState<Postulation[]>([]);

  // Pagination functionality
  const [page, setPage] = useState(1);
  const rowsPerPage = 4;
  const pages = Math.ceil(postulations.length / rowsPerPage);
  const items = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;

    return postulations.slice(start, end);
  }, [page, postulations]);

  // Filter form
  const { values, setFieldValue, handleSubmit } = useFormik({
    initialValues: {
      name: "",
      minAge: 18,
      maxAge: 70,
      gender: "",
      sector: "",
      campNo: 0,
      favs,
    },
    onSubmit,
  });

  // Solves Hydration Error of Table component
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Favs filter
  useEffect(() => {
    if (favs) {
      setPostulations(favsPostulations);
    } else {
      setPostulations(allPostulations);
    }
  }, [favs]);

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Filters
          setFieldValue={setFieldValue}
          values={values}
          sectorOptions={sectorOptions}
          genderOptions={genderOptions}
          selectedRows={selectedRows}
        />
      </form>
      <TableContainer>
        {isClient ? (
          <Table
            {...tableStyles}
            selectionMode="multiple"
            selectedKeys={selectedRows}
            onSelectionChange={setSelectedRows}
            bottomContent={
              <div className="flex w-full justify-center">
                <Pagination
                  showControls
                  showShadow
                  page={page}
                  total={pages}
                  onChange={(page) => setPage(page)}
                />
              </div>
            }
          >
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn key={column.key}>{column.label}</TableColumn>
              )}
            </TableHeader>
            <TableBody
              emptyContent={"No hay curriculums para mostrar"}
              items={items}
            >
              {(entry) => (
                <TableRow key={entry.id}>
                  {(columnKey) => (
                    <TableCell>{renderCell(entry, columnKey)}</TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        ) : null}
      </TableContainer>
    </>
  );
}
