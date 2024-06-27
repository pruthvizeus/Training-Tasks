using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using MySqlConnector;
using System.Globalization;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using CsvHelper;
using System.Dynamic;
using System.Collections.Generic;
using System.Linq;

namespace dotnet_task.Controllers
{
    [ApiController]
    [Route("upload")]
    public class UploadController : ControllerBase
    {
        private const int BatchSize = 1000; // Adjust batch size as necessary

        [HttpPost]
        public async Task<IActionResult> UploadFile(IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file uploaded." });
            }

            var uploadsDirectory = Path.Combine(Directory.GetCurrentDirectory(), "uploads");

            // Ensure the uploads directory exists
            Directory.CreateDirectory(uploadsDirectory);

            var filePath = Path.Combine(uploadsDirectory, file.FileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            List<dynamic> records;
            using (var reader = new StreamReader(filePath))
            using (var csv = new CsvReader(reader, CultureInfo.InvariantCulture))
            {
                records = new List<dynamic>(csv.GetRecords<dynamic>());
            }

            string connectionString = "Server=localhost;Database=pruthvi;User=root;Password=root;";
            var duplicateEmails = new List<string>();

            using (var connection = new MySqlConnection(connectionString))
            {
                await connection.OpenAsync();

                for (int i = 0; i < records.Count; i += BatchSize)
                {
                    var bulkInsertQuery = new StringBuilder("INSERT INTO employee (Name, Email, Contact) VALUES ");
                    var batch = records.Skip(i).Take(BatchSize);

                    foreach (var record in batch)
                    {
                        string name = MySqlHelper.EscapeString(record?.Name ?? string.Empty);
                        string email = MySqlHelper.EscapeString(record?.Email ?? string.Empty);
                        string contact = MySqlHelper.EscapeString(record?.Contact ?? string.Empty);

                        if (contact.Length > 20)
                        {
                            return BadRequest(new { message = $"Contact value too long: {contact}" });
                        }

                        bulkInsertQuery.Append($"('{name}', '{email}', '{contact}'),");
                    }

                 
                    bulkInsertQuery.Length--;

                    bulkInsertQuery.Append(" ON DUPLICATE KEY UPDATE Name=VALUES(Name), Contact=VALUES(Contact)");

                    using (var command = new MySqlCommand(bulkInsertQuery.ToString(), connection))
                    {
                        try
                        {
                            await command.ExecuteNonQueryAsync();
                        }
                        catch (MySqlException ex)
                        {
                           
                            return StatusCode(StatusCodes.Status500InternalServerError, new { message = $"Database error: {ex.Message}" });
                        }
                    }
                }
            }
            Console.WriteLine(duplicateEmails);

            if (duplicateEmails.Count > 0)
            {
                return Ok(new 
                { 
                    message = "File uploaded with some duplicates ignored.", 
                    filePath, 
                    duplicates = duplicateEmails 
                });
            }

            return Ok(new { message = "File uploaded and data inserted successfully.", filePath });
        }

        private string? ExtractDuplicateEmail(string errorMessage)
        {
           
            var match = System.Text.RegularExpressions.Regex.Match(errorMessage, @"key '(.+?)'");
            return match.Success ? match.Groups[1].Value : null;
        }
    }
}

