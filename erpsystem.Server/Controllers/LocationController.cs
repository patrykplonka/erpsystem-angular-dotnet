using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using Microsoft.Extensions.Caching.Memory;

[Route("api/[controller]")]
[ApiController]
public class LocationsController : ControllerBase
{
    private readonly IMemoryCache _cache;

    public LocationsController(IMemoryCache cache)
    {
        _cache = cache;
    }

    [HttpGet]
    public ActionResult<IEnumerable<LocationDto>> GetLocations()
    {
        const string cacheKey = "Locations";
        if (!_cache.TryGetValue(cacheKey, out IEnumerable<LocationDto> locations))
        {
            locations = new List<LocationDto>
            {
                new LocationDto { Id = 1, Name = "Regał A1, Półka B1" },
                new LocationDto { Id = 2, Name = "Regał A1, Półka B2" },
                new LocationDto { Id = 3, Name = "Regał A2, Półka B1" },
                new LocationDto { Id = 4, Name = "Regał A2, Półka B2" },
                new LocationDto { Id = 5, Name = "Regał B1, Półka C1" }
            };

            var cacheOptions = new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
            };
            _cache.Set(cacheKey, locations, cacheOptions);
        }

        return Ok(locations);
    }
}

public class LocationDto
{
    public int Id { get; set; }
    public string Name { get; set; }
}