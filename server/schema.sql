db.createCollection("registrations", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["team_name", "player_names", "status"],
      properties: {
        team_name: {
          bsonType: "string"
        },
        player_names: {
          bsonType: "array",
          items: {
            bsonType: "string"
          },
          minItems: 8,
          maxItems: 8
        },
        status: {
          enum: ["pending", "approved", "rejected"]
        },
        created_at: {
          bsonType: "date"
        }
      }
    }
  }
})