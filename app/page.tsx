"use client";

import { useState } from "react";
import { read, utils } from "xlsx";
import { Button, Dialog, DialogTitle, DialogContent, Card, Container, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid, CircularProgress } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { styled } from "@mui/material/styles";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [open, setOpen] = useState(false);


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

  // Aggregate results into categories for Pie Chart
  const categoryData = results.reduce((acc, result) => {
    const category = result.categories[0]?.name || "Uncategorized";
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(categoryData).map(([name, value]) => ({
    name,
    value,
  }));

  // Handle category click
  const handlePieClick = (data: any) => {
    setSelectedCategory(data.name);
    setOpen(true);
  };

  // Get questions for selected category
  const selectedQuestions = results.filter(
    (r) => r.categories[0]?.name === selectedCategory
  );

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#ffbb28"];


  return (
    <Container maxWidth="md" sx={{ py: 4, backgroundColor: "#f9f9f9", minHeight: "100vh" }}>
      <Card sx={{ p: 3, textAlign: "center", backgroundColor: "#f5f5f5" }}>
        <Typography variant="h4" fontWeight="bold">
          Bible Question Categorizer
        </Typography>
      </Card>

      <Card sx={{ mt: 4, p: 3, textAlign: "center", backgroundColor: "#f5f5f5" }}>
        <Typography variant="h5">Upload CSV File</Typography>
        <Button component="label" variant="contained" startIcon={<CloudUploadIcon />} sx={{ mt: 2 }}>
          Upload File
          <VisuallyHiddenInput
            type="file"
            accept=".csv"
            onChange={(e) => handleFileUpload(e, setQuestions, setQuestionPreview, "questions")}
          />
          <VisuallyHiddenInput
            type="file"
            accept=".csv"
            onChange={(e) => handleFileUpload(e, setCategories, setCategoryPreview, "categories")}
          />

        </Button>
      </Card>

      <Grid container justifyContent="center" sx={{ mt: 3 }}>
        <Button variant="contained" color="primary" onClick={categorizeQuestions} disabled={loading}>
          {loading ? <CircularProgress size={24} /> : "Categorize Questions"}
        </Button>
      </Grid>

      {results.length > 0 && (
        <Card sx={{ mt: 4, p: 3, textAlign: "center", backgroundColor: "#f5f5f5" }}>
          <Typography variant="h5" fontWeight="bold">
            Category Distribution
          </Typography>
          <PieChart width={400} height={300}>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
              onClick={handlePieClick}
            >
              {pieData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </Card>
      )}

      {/* Detailed Questions Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{selectedCategory} - Questions</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Question</strong></TableCell>
                  <TableCell><strong>Confidence</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedQuestions.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell>{result.question}</TableCell>
                    <TableCell>{result.categories[0]?.confidence}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
      </Dialog>
    </Container>
  );
}
