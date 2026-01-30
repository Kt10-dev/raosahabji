import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Container,
  SimpleGrid,
  Grid,
  GridItem,
  VStack,
  Text,
  Heading,
  Divider,
  Button,
  HStack,
  Flex,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Select,
  useToast,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerBody,
  DrawerCloseButton,
  Stack,
  Spacer,
  useColorModeValue,
  useDisclosure,
  Skeleton,
  SkeletonText,
} from "@chakra-ui/react";

import { FaSearch, FaFilter } from "react-icons/fa";
import { motion } from "framer-motion";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";

// Custom Components
import ProductCard from "../components/ProductCard/ProductCard";
import EmptyState from "../components/Utility/EmptyState";
import SidebarFilters from "../components/ProductsPage/SidebarFilters";

// ---------------- CONFIG ----------------
const API_BASE_URL = "https://raosahab-api.onrender.com";
const MIN_PRICE = 0;
const MAX_PRICE = 25000;

// ---------------- SKELETON COMPONENT ----------------
const ProductSkeleton = () => (
  <Box
    p={4}
    borderRadius="2xl"
    bg="rgba(255,255,255,0.05)"
    border="1px solid rgba(0,255,255,0.1)"
    backdropFilter="blur(10px)"
  >
    <Skeleton
      height="220px"
      borderRadius="xl"
      mb={4}
      startColor="gray.700"
      endColor="cyan.900"
    />
    <SkeletonText
      noOfLines={2}
      spacing="4"
      skeletonHeight="3"
      startColor="gray.600"
    />
    <HStack mt={6} justify="space-between">
      <Skeleton height="20px" width="70px" borderRadius="md" />
      <Skeleton height="36px" width="110px" borderRadius="full" />
    </HStack>
  </Box>
);

// ---------------- DEBOUNCE HOOK ----------------
function useDebounce(value, delay = 450) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const MotionBox = motion(Box);

export default function ProductsPage() {
  const [allProducts, setAllProducts] = useState([]);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    categories: [],
    priceRange: [MIN_PRICE, MAX_PRICE],
    sortBy: "relevance",
  });

  const location = useLocation();
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState("");
  const debouncedKeyword = useDebounce(keyword, 450);

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const bg = useColorModeValue("white", "gray.800");

  useEffect(() => {
    const currentKeyword =
      new URLSearchParams(location.search).get("keyword") || "";
    setKeyword(currentKeyword);
  }, [location.search]);

  // Fetching data from Render backend
  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, categoriesRes] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/products`),
          axios.get(`${API_BASE_URL}/api/categories`),
        ]);

        if (!mounted) return;

        const productList =
          productsRes.data.products ||
          (Array.isArray(productsRes.data) ? productsRes.data : []);
        setAllProducts(productList);

        const cats = categoriesRes.data.map((c) => c.name);
        setDynamicCategories(cats);

        if (filters.categories.length === 0) {
          setFilters((prev) => ({ ...prev, categories: cats }));
        }
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        setError("Failed to fetch data. Please check your connection.");
        setLoading(false);
      }
    };
    fetchData();
    return () => (mounted = false);
  }, [filters.categories.length, debouncedKeyword]);

  // 🟢 Logic: Showing ALL filtered products without slicing
  const filtered = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return [];
    const kw = debouncedKeyword.trim().toLowerCase();

    let list = allProducts.filter((p) => {
      const categoryName = p.category?.name || p.category || "Uncategorized";
      const catMatch =
        filters.categories.length > 0
          ? filters.categories.includes(categoryName)
          : true;
      const price =
        typeof p.price === "number" ? p.price : Number(p.price || 0);
      const priceMatch =
        price >= filters.priceRange[0] && price <= filters.priceRange[1];
      const text =
        `${p.name} ${p.description || ""} ${categoryName}`.toLowerCase();
      const kwMatch = kw ? text.includes(kw) : true;
      return catMatch && priceMatch && kwMatch;
    });

    if (filters.sortBy === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (filters.sortBy === "price-desc")
      list.sort((a, b) => b.price - a.price);
    else if (filters.sortBy === "newest")
      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return list;
  }, [allProducts, filters, debouncedKeyword]);

  const clearFilters = useCallback(() => {
    setFilters({
      categories: dynamicCategories,
      priceRange: [MIN_PRICE, MAX_PRICE],
      sortBy: "relevance",
    });
    setKeyword("");
    navigate("/products", { replace: true });
    toast({ title: "Filters Reset", status: "info", duration: 1000 });
  }, [navigate, dynamicCategories, toast]);

  const submitSearch = (e) => {
    e?.preventDefault();
    const qs = new URLSearchParams(location.search);
    if (keyword.trim()) qs.set("keyword", keyword.trim());
    else qs.delete("keyword");
    navigate({ pathname: "/products", search: qs.toString() });
  };

  if (error)
    return (
      <EmptyState
        title="Connection Error"
        description={error}
        iconName="warning"
        onClick={() => window.location.reload()}
      />
    );

  return (
    <Box
      bgGradient="linear(to-b, #0f0c29, #302b63, #24243e)"
      minH="100vh"
      pb={20}
    >
      <Container maxW="1300px" py={8} px={{ base: 4, md: 6 }}>
        <Stack
          direction={{ base: "column", md: "row" }}
          spacing={4}
          align="center"
          mb={6}
        >
          <VStack align="start" spacing={0}>
            <Heading
              size="lg"
              bgGradient="linear(to-r, cyan.400, pink.400)"
              bgClip="text"
              textShadow="0 0 8px cyan"
            >
              Rao Sahab Premium Collection
            </Heading>
            <Text color="cyan.200">Where Tradition Meets Technology.</Text>
          </VStack>
          <Spacer />
          <HStack spacing={3} w={{ base: "100%", md: "auto" }}>
            <Box
              as="form"
              onSubmit={submitSearch}
              w={{ base: "100%", md: "420px" }}
            >
              <InputGroup>
                <Input
                  placeholder="Search products..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  bg="rgba(255,255,255,0.05)"
                  color="white"
                  border="1px solid cyan"
                  _placeholder={{ color: "cyan.200" }}
                />
                <InputRightElement width="4.5rem">
                  <IconButton
                    aria-label="Search"
                    icon={<FaSearch />}
                    size="sm"
                    colorScheme="cyan"
                    onClick={submitSearch}
                  />
                </InputRightElement>
              </InputGroup>
            </Box>
            <Select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((p) => ({ ...p, sortBy: e.target.value }))
              }
              w="220px"
              bg="rgba(255,255,255,0.05)"
              color="white"
              border="1px solid cyan"
            >
              <option value="relevance" style={{ color: "black" }}>
                Sort: Relevance
              </option>
              <option value="price-asc" style={{ color: "black" }}>
                Price: Low to High
              </option>
              <option value="price-desc" style={{ color: "black" }}>
                Price: High to Low
              </option>
              <option value="newest" style={{ color: "black" }}>
                Newest Arrivals
              </option>
            </Select>
            <IconButton
              aria-label="Filters"
              icon={<FaFilter />}
              display={{ base: "inline-flex", md: "none" }}
              onClick={onOpen}
              colorScheme="cyan"
            />
          </HStack>
        </Stack>

        <Divider borderColor="cyan.400" mb={6} />

        <Grid templateColumns={{ base: "1fr", md: "280px 1fr" }} gap={8}>
          <GridItem display={{ base: "none", md: "block" }}>
            <MotionBox
              p={6}
              borderRadius="2xl"
              bg={bg}
              backdropFilter="blur(16px)"
              border="1px solid rgba(0,255,255,0.2)"
              position="sticky"
              top="100px"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <SidebarFilters
                filters={filters}
                setFilters={setFilters}
                clearFilters={clearFilters}
                categories={dynamicCategories}
              />
            </MotionBox>
          </GridItem>

          <GridItem>
            {loading ? (
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={6}>
                {[...Array(6)].map((_, i) => (
                  <ProductSkeleton key={i} />
                ))}
              </SimpleGrid>
            ) : filtered.length === 0 ? (
              <EmptyState
                title="No products found"
                description="Try resetting filters."
                iconName="search"
                ctaText="Clear filters"
                onClick={clearFilters}
              />
            ) : (
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={6}>
                {filtered.map((p) => (
                  <MotionBox
                    key={p._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: "spring", stiffness: 120 }}
                  >
                    <ProductCard product={p} glassmorphic />
                  </MotionBox>
                ))}
              </SimpleGrid>
            )}
          </GridItem>
        </Grid>
      </Container>

      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="xs">
        <DrawerOverlay />
        <DrawerContent bg="gray.800">
          <DrawerCloseButton color="cyan.300" />
          <DrawerBody p={6}>
            <SidebarFilters
              filters={filters}
              setFilters={setFilters}
              clearFilters={() => {
                clearFilters();
                onClose();
              }}
              categories={dynamicCategories}
            />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
