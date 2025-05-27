import React, { useState } from 'react';
import { Autocomplete, TextField, Box } from '@mui/material';

const ProductSearch = ({ products, onSelect, excludeSelected }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProducts = products.filter(
    p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !excludeSelected.includes(p._id)
  );

  return (
    <Autocomplete
      options={filteredProducts}
      getOptionLabel={(option) => option.name}
      onChange={(_, value) => {
        if (value) {
          onSelect(value);
          setSearchTerm('');
        }
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Tìm kiếm sản phẩm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
        />
      )}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option._id}>
          {option.name} ({option.SKU})
        </Box>
      )}
    />
  );
};

export default ProductSearch;