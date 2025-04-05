using System;
using System.Collections.Generic;
using System.Linq;
using erpsystem.Server.Data;
using erpsystem.Server.Models;
using erpsystem.Server.Models.DTOs;

namespace erpsystem.Server.Services
{
    public class WarehouseService : IWarehouseService
    {
        private readonly ApplicationDbContext _context;

        public WarehouseService(ApplicationDbContext context)
        {
            _context = context;
        }

        public IEnumerable<WarehouseItemDto> GetActiveItems()
        {
            return _context.WarehouseItems
                .Where(item => !item.IsDeleted)
                .Select(item => new WarehouseItemDto
                {
                    Id = item.Id,
                    Name = item.Name,
                    Code = item.Code,
                    Quantity = item.Quantity,
                    Price = item.Price,
                    Category = item.Category
                })
                .ToList();
        }

        public IEnumerable<WarehouseItemDto> GetDeletedItems()
        {
            return _context.WarehouseItems
                .Where(item => item.IsDeleted)
                .Select(item => new WarehouseItemDto
                {
                    Id = item.Id,
                    Name = item.Name,
                    Code = item.Code,
                    Quantity = item.Quantity,
                    Price = item.Price,
                    Category = item.Category
                })
                .ToList();
        }
    }
}