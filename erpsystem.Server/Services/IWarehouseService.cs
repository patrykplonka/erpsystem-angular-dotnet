using System.Collections.Generic;
using erpsystem.Server.Models.DTOs;

namespace erpsystem.Server.Services
{
    public interface IWarehouseService
    {
        IEnumerable<WarehouseItemDto> GetActiveItems();
        IEnumerable<WarehouseItemDto> GetDeletedItems();
    }
}
