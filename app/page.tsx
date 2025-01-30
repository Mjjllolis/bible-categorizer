"use client";

import { useState } from "react";
import { read, utils } from "xlsx";
import { Button, Card, Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid, CircularProgress } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { styled } from "@mui/material/styles";
import Image from "next/image";

const VisuallyHiddenInput = styled("input")({
  clip: "rect(0 0 0 0)",
  clipPath: "inset(50%)",
  height: 1,
  overflow: "hidden",
  position: "absolute",
  whiteSpace: "nowrap",
  width: 1,
});

interface Question {
  text: string;
}

interface Category {
  name: string;
}

interface Result {
  question: string;
  categories: { name: string; confidence: number }[];
}

export default function Home() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [questionPreview, setQuestionPreview] = useState<any[]>([]);
  const [categoryPreview, setCategoryPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: React.Dispatch<React.SetStateAction<any[]>>,
    previewSetter: React.Dispatch<React.SetStateAction<any[]>>,
    type: "questions" | "categories"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const workbook = read(event.target?.result, { type: "binary" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = utils.sheet_to_json(sheet);

      // Helper function to fix encoding issues
      const fixEncoding = (text: string) => {
        try {
          return decodeURIComponent(escape(text));
        } catch (e) {
          return text; // Return original text if decoding fails
        }
      };

      // Format data based on type & fix encoding issues
      const formattedData = rawData.map((row: any) =>
        type === "questions"
          ? { text: fixEncoding(row.Question) }
          : { name: fixEncoding(row.Category) }
      );

      setter(formattedData);
      previewSetter(rawData); // Store all rows for preview
    };
    reader.readAsBinaryString(file);
  };


  const categorizeQuestions = async () => {
    setLoading(true);
    const response = await fetch("/api/categorize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questions, categories }),
    });
    const data = await response.json();
    setResults(data);
    setLoading(false);
  };

  return (
    <Container maxWidth={false} sx={{ py: 4, maxWidth: "50%", backgroundColor: "#f9f9f9", textAlign: "center", minHeight: "100vh" }}>
      <Card sx={{ position: "relative", overflow: "hidden", height: 400, display: "flex", alignItems: "center", justifyContent: "center", px: 4, backgroundImage: 'url(/Background.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', color: "white", textShadow: "2px 2px 8px rgba(0, 0, 0, 0.7)" }}>
        <Typography variant="h3" fontWeight="bold" sx={{ textAlign: "center", px: 2, py: 1, borderRadius: 2, padding: "10px" }}>Bible Question Categorizer</Typography>
      </Card>

      <Card sx={{ mt: 4, p: 3, backgroundColor: "#f5f5f5", width: "100%" }}>
        <Typography variant="h5" fontWeight="bold" align="center">Upload CSV Files</Typography>
        <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
          <Grid item>
            <Button component="label" variant="contained" startIcon={<CloudUploadIcon />}>Upload Questions
              <VisuallyHiddenInput type="file" accept=".csv" onChange={(e) => handleFileUpload(e, setQuestions, setQuestionPreview, "questions")} />
            </Button>
          </Grid>
          <Grid item>
            <Button component="label" variant="contained" startIcon={<CloudUploadIcon />}>Upload Categories
              <VisuallyHiddenInput type="file" accept=".csv" onChange={(e) => handleFileUpload(e, setCategories, setCategoryPreview, "categories")} />
            </Button>
          </Grid>
        </Grid>
      </Card>

      <Grid container justifyContent="center" sx={{ mt: 3 }}>
        <Button variant="contained" color="primary" onClick={categorizeQuestions}>Categorize Questions</Button>
      </Grid>

      {loading && (
        <Grid container justifyContent="center" sx={{ mt: 2 }}>
          <CircularProgress />
        </Grid>
      )}

      {(questionPreview.length > 0 || categoryPreview.length > 0) && (
        <Grid container spacing={2} sx={{ mt: 4 }}>
          {/* Question Preview */}
          {questionPreview.length > 0 && (
            <Grid item xs={6}>
              <Card sx={{ p: 2, backgroundColor: "#f5f5f5", height: "40vh", overflowY: "auto" }}>
                <Typography variant="h6" fontWeight="bold">Questions Preview</Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        {Object.keys(questionPreview[0]).map((key, index) => (
                          <TableCell key={index}><strong>{key}</strong></TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {questionPreview.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((val, i) => (
                            <TableCell key={i}>{val as string}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>
          )}

          {/* Category Preview */}
          {categoryPreview.length > 0 && (
            <Grid item xs={6}>
              <Card sx={{ p: 2, backgroundColor: "#f5f5f5", height: "40vh", overflowY: "auto" }}>
                <Typography variant="h6" fontWeight="bold">Categories Preview</Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        {Object.keys(categoryPreview[0]).map((key, index) => (
                          <TableCell key={index}><strong>{key}</strong></TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {categoryPreview.map((row, index) => (
                        <TableRow key={index}>
                          {Object.values(row).map((val, i) => (
                            <TableCell key={i}>{val as string}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Card>
            </Grid>
          )}
        </Grid>
      )}

      {results.length > 0 && (
        <Card sx={{ mt: 4, p: 3, backgroundColor: "#f5f5f5", width: "100%" }}>
          <Typography variant="h5" fontWeight="bold">Results</Typography>
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: "60%" }}><strong>Question</strong></TableCell>
                  <TableCell sx={{ width: "30%" }}><strong>Category</strong></TableCell>
                  <TableCell sx={{ width: "10%" }}><strong>Confidence</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {results.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.question}</TableCell>
                    <TableCell>{result.categories[0]?.name || "Uncategorized"}</TableCell>
                    <TableCell>{result.categories[0]?.confidence}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

    </Container>
  );
}
