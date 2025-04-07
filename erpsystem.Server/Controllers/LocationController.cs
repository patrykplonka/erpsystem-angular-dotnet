using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;

[Route("api/[controller]")]
[ApiController]
public class LocationsController : ControllerBase
{
    [HttpGet]
    public ActionResult<IEnumerable<LocationDto>> GetLocations()
    {
        // Tutaj możesz pobrać dane z bazy danych
        var locations = new List<LocationDto>
        {
            new LocationDto { Id = 1, Name = "Regał A1, Półka B1" },
            new LocationDto { Id = 2, Name = "Regał A1, Półka B2" },
            new LocationDto { Id = 3, Name = "Regał A2, Półka B1" },
            new LocationDto { Id = 4, Name = "Regał A2, Półka B2" },
            new LocationDto { Id = 5, Name = "Regał B1, Półka C1" }
        };
        return Ok(locations);
    }
}

public class LocationDto
{
    public int Id { get; set; }
    public string Name { get; set; }
}